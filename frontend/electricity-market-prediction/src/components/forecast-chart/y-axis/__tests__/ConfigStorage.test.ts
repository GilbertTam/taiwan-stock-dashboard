import { ConfigStorage, CONFIG_STORAGE_KEY, CURRENT_CONFIG_VERSION, AppYAxisConfig } from '../ConfigStorage';
import fc from 'fast-check';

describe('ConfigStorage', () => {
    let storage: ConfigStorage;

    beforeEach(() => {
        localStorage.clear();
        storage = new ConfigStorage();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Unit Tests', () => {
        it('loadConfig应该在没有数据时返回null', () => {
            expect(storage.loadConfig()).toBeNull();
        });

        it('loadConfig在版本不匹配时应该返回null', () => {
            localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({
                version: 'old-version',
                primaryRange: { min: 0, max: 100 },
                secondaryRange: { min: 0, max: 100 },
                dataSourceMapping: { 'series1': 'primary' }
            }));

            expect(storage.loadConfig()).toBeNull();
        });

        it('loadConfig在JSON解析失败时应该捕获异常并返回null', () => {
            localStorage.setItem(CONFIG_STORAGE_KEY, 'invalid-json{');
            const spy = jest.spyOn(console, 'warn').mockImplementation();

            expect(storage.loadConfig()).toBeNull();
            expect(spy).toHaveBeenCalledWith('Failed to load Y-axis config from storage', expect.any(Error));
        });

        it('saveConfig应该设置版本并保存', () => {
            const config: AppYAxisConfig = {
                primary: { min: 0, max: 100 },
                secondary: { min: 10, max: 50 },
                dataSourceMapping: { s1: 'primary', s2: 'secondary' }
            };

            storage.saveConfig(config);

            const saved = JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || '');
            expect(saved.version).toBe(CURRENT_CONFIG_VERSION);
            expect(saved.primary).toEqual(config.primary);
            expect(saved.secondary).toEqual(config.secondary);
            expect(saved.lastUpdated).toBeDefined();
        });

        it('clearConfig应该移除存储项', () => {
            localStorage.setItem(CONFIG_STORAGE_KEY, '{"some": "data"}');
            storage.clearConfig();
            expect(localStorage.getItem(CONFIG_STORAGE_KEY)).toBeNull();
        });
    });

    describe('Properties', () => {
        // Feature: forecast-y-axis-config, Property 10.4: Y轴配置往返持久化
        it('属性10.4: Y轴配置往返持久化，保存后加载数据应相等', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        primary: fc.option(fc.record({ min: fc.double({ noNaN: true, noDefaultInfinity: true }), max: fc.double({ noNaN: true, noDefaultInfinity: true }) }), { nil: undefined }),
                        secondary: fc.option(fc.record({ min: fc.double({ noNaN: true, noDefaultInfinity: true }), max: fc.double({ noNaN: true, noDefaultInfinity: true }) }), { nil: undefined }),
                        dataSourceMapping: fc.dictionary(fc.string(), fc.constantFrom('primary', 'secondary'))
                    }),
                    (config) => {
                        // Setup
                        const localStore = new ConfigStorage();

                        // Act
                        localStore.saveConfig(config as AppYAxisConfig);
                        const loaded = localStore.loadConfig();

                        // Assert
                        expect(loaded).not.toBeNull();
                        if (loaded) {
                            const expectedConfig = JSON.parse(JSON.stringify(config));
                            expect(loaded.primary).toEqual(expectedConfig.primary);
                            expect(loaded.secondary).toEqual(expectedConfig.secondary);
                            expect(loaded.dataSourceMapping).toEqual(expectedConfig.dataSourceMapping);
                            expect(loaded.version).toBe(CURRENT_CONFIG_VERSION);
                        }
                    }
                )
            );
        });
    });
});
