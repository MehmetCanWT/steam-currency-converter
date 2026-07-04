-- Steam Currency Converter Plugin
-- Author: MehmetCanWT
local logger = require("logger")
local millennium = require("millennium")
local http = require("http")
local json = require("json")
local fs = require("fs")
local utils = require("utils")

-- In-memory cache for exchange rates
local rates_cache = nil

-- Helper to get absolute path to rates_cache.json
local function get_cache_path()
    local backend_path = utils.get_backend_path()
    if not backend_path then
        logger:error("Failed to get backend path")
        return nil
    end
    return fs.join(backend_path, "rates_cache.json")
end

-- Save rates to cache file
local function save_rates_cache(rates_data)
    local path = get_cache_path()
    if not path then return false end

    local success, content = pcall(json.encode, rates_data)
    if not success then
        logger:error("Failed to encode rates to JSON: " .. tostring(content))
        return false
    end

    local write_success, err = utils.write_file(path, content)
    if not write_success then
        logger:error("Failed to write rates cache to disk: " .. tostring(err))
        return false
    end

    return true
end

-- Load rates from cache file
local function load_rates_cache()
    local path = get_cache_path()
    if not path or not fs.exists(path) then
        logger:info("Rates cache file does not exist yet")
        return nil
    end

    local content, err = utils.read_file(path)
    if not content then
        logger:error("Failed to read rates cache file: " .. tostring(err))
        return nil
    end

    local success, rates_data = pcall(json.decode, content)
    if not success then
        logger:error("Failed to decode rates cache JSON: " .. tostring(rates_data))
        return nil
    end

    return rates_data
end

-- Internal: Force fetch rates from API (returns table or nil)
local function _fetch_rates()
    logger:info("Fetching exchange rates from API...")
    local api_url = "https://open.er-api.com/v6/latest/USD"
    local response, err = http.get(api_url)

    if not response then
        logger:error("HTTP request to ExchangeRate API failed: " .. tostring(err))
        return nil
    end

    if response.status ~= 200 then
        logger:error("API returned non-200 status code: " .. response.status)
        return nil
    end

    local success, api_data = pcall(json.decode, response.body)
    if not success then
        logger:error("Failed to parse API response JSON: " .. tostring(api_data))
        return nil
    end

    if api_data.result ~= "success" then
        logger:error("API error: " .. tostring(api_data["error-type"]))
        return nil
    end

    local rates_data = {
        timestamp = math.floor(utils.time()),
        rates = api_data.rates
    }

    rates_cache = rates_data
    save_rates_cache(rates_cache)
    logger:info("Successfully updated and cached exchange rates")

    return rates_cache
end

-- Internal: Check cache age and update if older than 1 hour (returns table)
local function _check_and_update_rates()
    if not rates_cache then
        rates_cache = load_rates_cache()
    end

    local current_time = math.floor(utils.time())
    local should_fetch = false

    if not rates_cache or not rates_cache.timestamp or not rates_cache.rates then
        logger:info("No rates cache found, fetching fresh rates...")
        should_fetch = true
    elseif current_time - rates_cache.timestamp > 3600 then
        logger:info("Rates cache is older than 1 hour, refreshing...")
        should_fetch = true
    end

    if should_fetch then
        local fetched = _fetch_rates()
        if fetched then
            return fetched
        else
            logger:warn("Stale cache update failed. Falling back to existing cache if available.")
        end
    else
        logger:info("Rates cache is fresh (" .. tostring(current_time - rates_cache.timestamp) .. "s old)")
    end

    return rates_cache
end

-- ==================== IPC METHODS EXPOSED TO FRONTEND ====================

-- IPC: Force fetch rates and return JSON string
function fetch_rates()
    local res = _fetch_rates()
    if res then
        return json.encode(res)
    else
        return "null"
    end
end

-- IPC: Check and update rates and return JSON string
function check_and_update_rates()
    local res = _check_and_update_rates()
    if res then
        return json.encode(res)
    else
        return "null"
    end
end

-- IPC: Retrieve rates and configurations and return JSON string
function get_rates_and_settings()
    if not rates_cache then
        rates_cache = load_rates_cache()
    end

    local target_currency = millennium.config.get("target_currency") or "TRY"
    local display_mode = millennium.config.get("display_mode") or "append"

    local data = {
        rates = rates_cache and rates_cache.rates or {},
        timestamp = rates_cache and rates_cache.timestamp or 0,
        targetCurrency = target_currency,
        displayMode = display_mode
    }
    return json.encode(data)
end

-- Millennium standard lifecycle method: called when plugin starts
local function on_load()
    logger:info("Steam Currency Converter plugin loading...")

    -- Set default settings if not exists
    if millennium.config.get("target_currency") == nil then
        millennium.config.set("target_currency", "TRY")
    end
    if millennium.config.get("display_mode") == nil then
        millennium.config.set("display_mode", "append")
    end

    -- Initial rates check & load
    _check_and_update_rates()

    millennium.ready()
end

-- Called when Steam UI is ready
local function on_frontend_loaded()
    logger:info("Steam UI frontend loaded")
end

-- Called when plugin is unloaded
local function on_unload()
    logger:info("Steam Currency Converter plugin unloaded")
end

return {
    on_load = on_load,
    on_frontend_loaded = on_frontend_loaded,
    on_unload = on_unload,
    
    -- IPC methods exposed to JS
    get_rates_and_settings = get_rates_and_settings,
    fetch_rates = fetch_rates,
    check_and_update_rates = check_and_update_rates
}
