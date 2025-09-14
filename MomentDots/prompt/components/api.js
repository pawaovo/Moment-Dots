// AI API 调用模块 - 集成到MomentDots

class PromptAIService {
    constructor() {
        this.settings = null;
        this.loadSettings();
    }

    async loadSettings() {
        try {
            const data = await chrome.storage.local.get(['promptSettings']);
            this.settings = data.promptSettings || this.getDefaultSettings();
        } catch (error) {
            // 如果Chrome storage不可用（如测试环境），使用默认设置
            console.warn('Chrome storage不可用，使用默认设置:', error);
            this.settings = this.getDefaultSettings();
        }
    }

    getDefaultSettings() {
        return {
            models: [
                {
                    id: 'gemini-2.5-flash',
                    name: 'Gemini 2.5 Flash',
                    apiKey: 'AIzaSyDJ8RG1hMXCNWNlQ-uCzeCQCRq_RRx28Bc',
                    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
                }
            ],
            defaultModel: 'gemini-2.5-flash'
        };
    }

    async updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        await chrome.storage.local.set({ promptSettings: this.settings });
    }

    getModel(modelId) {
        // 确保settings已初始化
        if (!this.settings) {
            this.settings = this.getDefaultSettings();
        }
        return this.settings.models.find(model => model.id === modelId) || this.settings.models[0];
    }

    async rewriteText(originalText, promptContent, modelId = null) {
        try {
            const model = this.getModel(modelId || this.settings.defaultModel);

            if (!model.apiKey) {
                throw new Error('API Key 未配置，请在设置中配置 API Key');
            }

            // 组合提示词内容和用户输入
            // 将【用户输入内容】替换为实际的用户输入
            let combinedContent = promptContent;
            if (combinedContent.includes('【用户输入内容】')) {
                combinedContent = combinedContent.replace('【用户输入内容】', originalText);
            } else {
                // 如果提示词中没有占位符，则在末尾添加用户输入
                combinedContent = `${promptContent}\n\n用户输入的内容：\n${originalText}`;
            }

            const requestBody = {
                contents: [{
                    parts: [{
                        text: combinedContent
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                }
            };

            const response = await fetch(`${model.endpoint}?key=${model.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API 请求失败: ${response.status} ${response.statusText}${errorData.error?.message ? ' - ' + errorData.error.message : ''}`);
            }

            const data = await response.json();
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('API 返回数据格式错误');
            }

            const result = data.candidates[0].content.parts[0].text;
            return result;

        } catch (error) {
            console.error('AI改写失败:', error);
            throw error;
        }
    }

    // 获取可用模型列表
    getAvailableModels() {
        return this.settings.models.map(model => ({
            id: model.id,
            name: model.name
        }));
    }

    // 添加新模型
    async addModel(modelConfig) {
        if (!modelConfig.id || !modelConfig.name || !modelConfig.endpoint) {
            throw new Error('模型配置不完整');
        }

        const existingModel = this.settings.models.find(m => m.id === modelConfig.id);
        if (existingModel) {
            throw new Error('模型ID已存在');
        }

        this.settings.models.push(modelConfig);
        await this.updateSettings(this.settings);
    }

    // 删除模型
    async removeModel(modelId) {
        if (this.settings.models.length <= 1) {
            throw new Error('至少需要保留一个模型');
        }

        this.settings.models = this.settings.models.filter(m => m.id !== modelId);
        
        // 如果删除的是默认模型，设置第一个模型为默认
        if (this.settings.defaultModel === modelId) {
            this.settings.defaultModel = this.settings.models[0].id;
        }

        await this.updateSettings(this.settings);
    }

    // 更新模型配置
    async updateModel(modelId, updates) {
        const modelIndex = this.settings.models.findIndex(m => m.id === modelId);
        if (modelIndex === -1) {
            throw new Error('模型不存在');
        }

        this.settings.models[modelIndex] = { ...this.settings.models[modelIndex], ...updates };
        await this.updateSettings(this.settings);
    }

    // 设置默认模型
    async setDefaultModel(modelId) {
        const model = this.getModel(modelId);
        if (!model) {
            throw new Error('模型不存在');
        }

        this.settings.defaultModel = modelId;
        await this.updateSettings(this.settings);
    }

    // 测试API连接
    async testConnection(modelId = null) {
        try {
            const testText = "测试连接";
            const testPrompt = "请简单回复'连接成功'";
            const result = await this.rewriteText(testText, testPrompt, modelId);
            return { success: true, result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 获取使用统计
    async getUsageStats() {
        const data = await chrome.storage.local.get(['promptUsageStats']);
        return data.promptUsageStats || {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            lastUsed: null
        };
    }

    // 更新使用统计
    async updateUsageStats(success = true) {
        const stats = await this.getUsageStats();
        stats.totalRequests++;
        if (success) {
            stats.successfulRequests++;
        } else {
            stats.failedRequests++;
        }
        stats.lastUsed = new Date().toISOString();
        
        await chrome.storage.local.set({ promptUsageStats: stats });
    }
}

// 延迟创建全局实例，确保Chrome API可用
window.promptAIService = null;

// 创建实例的函数
function createPromptAIService() {
    if (!window.promptAIService) {
        window.promptAIService = new PromptAIService();
    }
    return window.promptAIService;
}

// 导出创建函数
window.createPromptAIService = createPromptAIService;
