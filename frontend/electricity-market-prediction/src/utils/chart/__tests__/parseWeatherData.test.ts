import { parseWeatherData, formatWeatherData, parseWeatherDataWithErrorHandling } from '../converters';

/**
 * Unit tests for weather data parser
 * Requirements: 11.5
 */
describe('parseWeatherData', () => {
    describe('error message displays on parse failure', () => {
        it('should return descriptive error for non-array input', () => {
            const result = parseWeatherData({ not: 'an array' });
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Response is not an array');
        });

        it('should return descriptive error for missing timestamp', () => {
            const apiResponse = [{
                model: 'jma',
                area: 'Tokyo',
                temperature_2m: 20
            }];
            
            const result = parseWeatherData(apiResponse);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing timestamp');
            expect(result.error).toContain('index 0');
        });

        it('should return descriptive error for invalid timestamp type', () => {
            const apiResponse = [{
                datetime: 12345, // Number instead of string
                model: 'jma',
                area: 'Tokyo'
            }];
            
            const result = parseWeatherData(apiResponse);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid timestamp type');
            expect(result.error).toContain('expected string');
        });

        it('should return descriptive error for invalid timestamp format', () => {
            const apiResponse = [{
                datetime: 'not-a-valid-timestamp',
                model: 'jma',
                area: 'Tokyo'
            }];
            
            const result = parseWeatherData(apiResponse);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid timestamp format');
            expect(result.error).toContain('not-a-valid-timestamp');
            expect(result.error).toContain('ISO8601');
        });

        it('should return descriptive error for missing model identifier', () => {
            const apiResponse = [{
                datetime: '2024-01-15T10:00:00Z',
                area: 'Tokyo',
                temperature_2m: 20
            }];
            
            const result = parseWeatherData(apiResponse);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing or invalid model identifier');
            expect(result.error).toContain('index 0');
        });

        it('should return descriptive error for invalid model identifier type', () => {
            const apiResponse = [{
                datetime: '2024-01-15T10:00:00Z',
                model: 123, // Number instead of string
                area: 'Tokyo'
            }];
            
            const result = parseWeatherData(apiResponse);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing or invalid model identifier');
        });

        it('should return descriptive error for empty model identifier', () => {
            const apiResponse = [{
                datetime: '2024-01-15T10:00:00Z',
                model: '', // Empty string
                area: 'Tokyo'
            }];
            
            const result = parseWeatherData(apiResponse);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing or invalid model identifier');
        });

        it('should indicate the correct index for errors in middle of array', () => {
            const apiResponse = [
                {
                    datetime: '2024-01-15T10:00:00Z',
                    model: 'jma',
                    area: 'Tokyo',
                    temperature_2m: 20,
                    relative_humidity_2m: 60,
                    precipitation: 0,
                    rain: 0,
                    snowfall: 0,
                    wind_speed_10m: 5,
                    wind_direction_10m: 'N',
                    cloud_cover: 50,
                    shortwave_radiation: 100,
                    weather_code_jwa: 1,
                    is_day: 1
                },
                {
                    datetime: '2024-01-15T11:00:00Z',
                    model: 'ecmwf',
                    area: 'Tokyo',
                    temperature_2m: 21,
                    relative_humidity_2m: 58,
                    precipitation: 0,
                    rain: 0,
                    snowfall: 0,
                    wind_speed_10m: 6,
                    wind_direction_10m: 'NE',
                    cloud_cover: 45,
                    shortwave_radiation: 110,
                    weather_code_jwa: 1,
                    is_day: 1
                },
                {
                    datetime: 'INVALID',
                    model: 'gfs',
                    area: 'Tokyo'
                }
            ];
            
            const result = parseWeatherData(apiResponse);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('index 2');
        });
    });

    describe('handling of missing model identifiers', () => {
        it('should fail when model is null', () => {
            const apiResponse = [{
                datetime: '2024-01-15T10:00:00Z',
                model: null,
                area: 'Tokyo'
            }];
            
            const result = parseWeatherData(apiResponse);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing or invalid model identifier');
        });

        it('should fail when model is undefined', () => {
            const apiResponse = [{
                datetime: '2024-01-15T10:00:00Z',
                model: undefined,
                area: 'Tokyo'
            }];
            
            const result = parseWeatherData(apiResponse);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing or invalid model identifier');
        });

        it('should fail when model field is missing entirely', () => {
            const apiResponse = [{
                datetime: '2024-01-15T10:00:00Z',
                area: 'Tokyo'
                // model field missing
            }];
            
            const result = parseWeatherData(apiResponse);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing or invalid model identifier');
        });
    });

    describe('successful parsing', () => {
        it('should successfully parse valid weather data', () => {
            const apiResponse = [{
                datetime: '2024-01-15T10:00:00Z',
                model: 'jma',
                area: 'Tokyo',
                temperature_2m: 20.5,
                relative_humidity_2m: 60,
                precipitation: 0,
                rain: 0,
                snowfall: 0,
                wind_speed_10m: 5.2,
                wind_direction_10m: 'N',
                cloud_cover: 50,
                shortwave_radiation: 100,
                weather_code_jwa: 1,
                is_day: 1
            }];
            
            const result = parseWeatherData(apiResponse);
            
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data!.length).toBe(1);
            expect(result.data![0].datetime).toBe('2024-01-15T10:00:00Z');
            expect(result.data![0].model).toBe('jma');
            expect(result.data![0].temperature_2m).toBe(20.5);
        });

        it('should handle null values for optional fields', () => {
            const apiResponse = [{
                datetime: '2024-01-15T10:00:00Z',
                model: 'jma',
                area: 'Tokyo',
                temperature_2m: null,
                relative_humidity_2m: null,
                precipitation: null,
                rain: null,
                snowfall: null,
                wind_speed_10m: null,
                wind_direction_10m: 'N',
                cloud_cover: null,
                shortwave_radiation: null,
                weather_code_jwa: null,
                is_day: null
            }];
            
            const result = parseWeatherData(apiResponse);
            
            expect(result.success).toBe(true);
            expect(result.data![0].temperature_2m).toBeNull();
            expect(result.data![0].precipitation).toBeNull();
        });

        it('should parse multiple records', () => {
            const apiResponse = [
                {
                    datetime: '2024-01-15T10:00:00Z',
                    model: 'jma',
                    area: 'Tokyo',
                    temperature_2m: 20,
                    relative_humidity_2m: 60,
                    precipitation: 0,
                    rain: 0,
                    snowfall: 0,
                    wind_speed_10m: 5,
                    wind_direction_10m: 'N',
                    cloud_cover: 50,
                    shortwave_radiation: 100,
                    weather_code_jwa: 1,
                    is_day: 1
                },
                {
                    datetime: '2024-01-15T11:00:00Z',
                    model: 'ecmwf',
                    area: 'Osaka',
                    temperature_2m: 21,
                    relative_humidity_2m: 58,
                    precipitation: 0,
                    rain: 0,
                    snowfall: 0,
                    wind_speed_10m: 6,
                    wind_direction_10m: 'NE',
                    cloud_cover: 45,
                    shortwave_radiation: 110,
                    weather_code_jwa: 1,
                    is_day: 1
                }
            ];
            
            const result = parseWeatherData(apiResponse);
            
            expect(result.success).toBe(true);
            expect(result.data!.length).toBe(2);
            expect(result.data![0].model).toBe('jma');
            expect(result.data![1].model).toBe('ecmwf');
        });
    });
});

describe('parseWeatherDataWithErrorHandling', () => {
    it('should call error callback on parse failure', () => {
        const onError = jest.fn();
        const apiResponse = { not: 'an array' };
        
        const result = parseWeatherDataWithErrorHandling(apiResponse, onError);
        
        expect(result).toEqual([]);
        expect(onError).toHaveBeenCalledWith(
            '天氣資料格式錯誤，請聯繫系統管理員',
            'Response is not an array'
        );
    });

    it('should log error to console on parse failure', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const apiResponse = { not: 'an array' };
        
        parseWeatherDataWithErrorHandling(apiResponse);
        
        expect(consoleSpy).toHaveBeenCalledWith(
            'Weather data parse error:',
            'Response is not an array'
        );
        
        consoleSpy.mockRestore();
    });

    it('should return empty array on parse failure to prevent crashes', () => {
        const apiResponse = { not: 'an array' };
        
        const result = parseWeatherDataWithErrorHandling(apiResponse);
        
        expect(result).toEqual([]);
        expect(Array.isArray(result)).toBe(true);
    });

    it('should return parsed data on success', () => {
        const apiResponse = [{
            datetime: '2024-01-15T10:00:00Z',
            model: 'jma',
            area: 'Tokyo',
            temperature_2m: 20,
            relative_humidity_2m: 60,
            precipitation: 0,
            rain: 0,
            snowfall: 0,
            wind_speed_10m: 5,
            wind_direction_10m: 'N',
            cloud_cover: 50,
            shortwave_radiation: 100,
            weather_code_jwa: 1,
            is_day: 1
        }];
        
        const result = parseWeatherDataWithErrorHandling(apiResponse);
        
        expect(result.length).toBe(1);
        expect(result[0].model).toBe('jma');
    });

    it('should not call error callback on success', () => {
        const onError = jest.fn();
        const apiResponse = [{
            datetime: '2024-01-15T10:00:00Z',
            model: 'jma',
            area: 'Tokyo',
            temperature_2m: 20,
            relative_humidity_2m: 60,
            precipitation: 0,
            rain: 0,
            snowfall: 0,
            wind_speed_10m: 5,
            wind_direction_10m: 'N',
            cloud_cover: 50,
            shortwave_radiation: 100,
            weather_code_jwa: 1,
            is_day: 1
        }];
        
        parseWeatherDataWithErrorHandling(apiResponse, onError);
        
        expect(onError).not.toHaveBeenCalled();
    });
});

describe('formatWeatherData', () => {
    it('should format weather data to API-compatible format', () => {
        const weatherData = [{
            datetime: '2024-01-15T10:00:00Z',
            area: 'Tokyo',
            model: 'jma',
            temperature_2m: 20.5,
            relative_humidity_2m: 60,
            precipitation: 0,
            rain: 0,
            snowfall: 0,
            wind_speed_10m: 5.2,
            wind_direction_10m: 'N',
            cloud_cover: 50,
            shortwave_radiation: 100,
            weather_code_jwa: 1,
            is_day: 1
        }];
        
        const formatted = formatWeatherData(weatherData);
        
        expect(formatted.length).toBe(1);
        expect(formatted[0].datetime).toBe('2024-01-15T10:00:00Z');
        expect(formatted[0].model).toBe('jma');
        expect(formatted[0].temperature_2m).toBe(20.5);
    });

    it('should handle null values for optional fields', () => {
        const weatherData = [{
            datetime: '2024-01-15T10:00:00Z',
            area: 'Tokyo',
            model: 'jma',
            temperature_2m: null,
            relative_humidity_2m: null,
            precipitation: null,
            rain: null,
            snowfall: null,
            wind_speed_10m: null,
            wind_direction_10m: 'N',
            cloud_cover: null,
            shortwave_radiation: null,
            weather_code_jwa: null,
            is_day: null
        }];
        
        const formatted = formatWeatherData(weatherData);
        
        expect(formatted[0].temperature_2m).toBeNull();
        expect(formatted[0].precipitation).toBeNull();
        expect(formatted[0].wind_speed_10m).toBeNull();
    });

    it('should only include optional fields if present', () => {
        const weatherData = [{
            datetime: '2024-01-15T10:00:00Z',
            area: 'Tokyo',
            model: 'jma',
            temperature_2m: 20,
            relative_humidity_2m: 60,
            precipitation: 0,
            rain: 0,
            snowfall: 0,
            wind_speed_10m: 5,
            wind_direction_10m: 'N',
            cloud_cover: 50,
            shortwave_radiation: 100,
            weather_code_jwa: 1,
            is_day: 1,
            // Optional field present
            area_ch: '東京'
        }];
        
        const formatted = formatWeatherData(weatherData);
        
        expect(formatted[0].area_ch).toBe('東京');
    });

    it('should not include optional fields if undefined', () => {
        const weatherData = [{
            datetime: '2024-01-15T10:00:00Z',
            area: 'Tokyo',
            model: 'jma',
            temperature_2m: 20,
            relative_humidity_2m: 60,
            precipitation: 0,
            rain: 0,
            snowfall: 0,
            wind_speed_10m: 5,
            wind_direction_10m: 'N',
            cloud_cover: 50,
            shortwave_radiation: 100,
            weather_code_jwa: 1,
            is_day: 1
            // area_ch not present
        }];
        
        const formatted = formatWeatherData(weatherData);
        
        expect('area_ch' in formatted[0]).toBe(false);
    });
});
