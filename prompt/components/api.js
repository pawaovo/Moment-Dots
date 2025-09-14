// AI API 调用模块

class AIService {
    constructor() {
        this.settings = null;
        this.loadSettings();
    }

    async loadSettings() {
        const data = await chrome.storage.local.get(['settings']);
        this.settings = data.settings || {
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
        await chrome.storage.local.set({ settings: this.settings });
    }

    getModel(modelId) {
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

            // 根据不同的模型调用不同的API
            if (model.id.includes('gemini')) {
                return await this.callGeminiAPI(model, combinedContent);
            } else {
                return await this.callGenericAPI(model, combinedContent);
            }
        } catch (error) {
            console.error('AI API 调用失败:', error);
            throw error;
        }
    }

    async callGeminiAPI(model, combinedContent) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${model.apiKey}`;

        // 构建 Gemini API 请求格式
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
                maxOutputTokens: 2048,
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API 调用失败: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();

        // 验证响应数据结构
        return this.validateAndExtractGeminiResponse(data);
    }

    async callGenericAPI(model, combinedContent) {
        // 为通用API构建消息格式
        const messages = [
            {
                role: 'user',
                content: combinedContent
            }
        ];

        const response = await fetch(model.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${model.apiKey}`
            },
            body: JSON.stringify({
                model: model.id,
                messages: messages,
                temperature: 0.7,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API 调用失败: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('API 返回数据格式错误');
        }

        return data.choices[0].message.content;
    }

    // 验证Gemini API响应数据
    validateAndExtractGeminiResponse(data) {
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('API 返回的候选结果为空');
        }

        const candidate = data.candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            throw new Error('API 返回的内容格式错误');
        }

        const resultText = candidate.content.parts[0].text;
        if (!resultText) {
            throw new Error('API 返回的文本内容为空');
        }

        return resultText;
    }

    // 测试 API 连接
    async testConnection(modelId) {
        try {
            const result = await this.rewriteText(
                '测试文本',
                '请简单回复"连接成功"',
                modelId
            );
            return { success: true, message: '连接成功' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

// 创建全局实例
window.aiService = new AIService();
