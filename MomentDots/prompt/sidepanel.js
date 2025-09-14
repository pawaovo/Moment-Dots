// 提示词助手主应用 - 集成到MomentDots

// 全局Toast管理器
class PromptToastManager {
    static show(message, type = 'success') {
        // 移除现有的toast
        const existingToast = document.querySelector('.prompt-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'prompt-toast';

        if (type === 'error') {
            toast.classList.add('error');
        }

        const bgColor = type === 'error' ? '#ef4444' : '#10b981';
        const icon = type === 'error' ? '❌' : '✅';

        toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'prompt-slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 3000);
    }

    async exportData() {
        try {
            const data = {
                categories: this.categories,
                prompts: this.prompts,
                settings: this.settings,
                exportTime: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `prompt-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();

            URL.revokeObjectURL(url);
            PromptToastManager.show('导出成功', 'success');
        } catch (error) {
            console.error('导出失败:', error);
            PromptToastManager.show('导出失败', 'error');
        }
    }

    async importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.categories || !data.prompts) {
                throw new Error('数据格式不正确');
            }

            // 合并数据
            const newCategories = [...new Set([...this.categories, ...data.categories])];
            const newPrompts = [...this.prompts];

            // 添加新提示词（避免重复）
            data.prompts.forEach(prompt => {
                if (!newPrompts.find(p => p.id === prompt.id)) {
                    newPrompts.push({
                        ...prompt,
                        id: prompt.id || 'prompt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
                    });
                }
            });

            // 保存数据
            await chrome.storage.local.set({
                promptCategories: newCategories,
                promptPrompts: newPrompts,
                promptSettings: data.settings || this.settings
            });

            // 重新加载数据
            await this.loadData();
            this.render();

            PromptToastManager.show(`导入成功，新增 ${data.prompts.length} 个提示词`, 'success');
        } catch (error) {
            console.error('导入失败:', error);
            PromptToastManager.show('导入失败：' + error.message, 'error');
        }
    }

    async refresh() {
        await this.loadData();
        this.render();
    }
}

// 主要应用逻辑
class PromptApp {
    constructor() {
        this.currentCategory = '全部';
        this.categories = [];
        this.prompts = [];
        this.settings = {};

        // 缓存DOM元素，避免重复查询
        this.elements = {};

        // 统一的存储键名 - 使用前缀避免冲突
        this.STORAGE_KEYS = ['promptCategories', 'promptPrompts', 'promptSettings'];

        this.init();
    }

    async init() {
        this.cacheElements();
        await this.loadData();
        this.bindEvents();
        this.render();
    }

    cacheElements() {
        // 缓存常用的DOM元素
        this.elements = {
            addPromptBtn: document.getElementById('promptAddBtn'),
            settingsBtn: document.getElementById('promptSettingsBtn'),
            exportBtn: document.getElementById('promptExportBtn'),
            importBtn: document.getElementById('promptImportBtn'),
            importFile: document.getElementById('promptImportFile'),
            categoryTabs: document.getElementById('promptCategoryTabs'),
            promptList: document.getElementById('promptList'),

            // 弹窗相关元素
            closeModalBtn: document.getElementById('promptCloseModalBtn'),
            cancelBtn: document.getElementById('promptCancelBtn'),
            closeRewriteBtn: document.getElementById('promptCloseRewriteBtn'),
            cancelRewriteBtn: document.getElementById('promptCancelRewriteBtn'),
            closeSettingsBtn: document.getElementById('promptCloseSettingsBtn'),
            cancelSettingsBtn: document.getElementById('promptCancelSettingsBtn'),
            saveSettingsBtn: document.getElementById('promptSaveSettingsBtn'),

            // 设置表单元素
            apiKey: document.getElementById('promptApiKey'),
            apiEndpoint: document.getElementById('promptApiEndpoint'),
            defaultModel: document.getElementById('promptDefaultModel')
        };
    }

    async loadData() {
        const data = await chrome.storage.local.get(this.STORAGE_KEYS);
        this.categories = data.promptCategories || ['全部'];
        this.prompts = data.promptPrompts || [];
        this.settings = data.promptSettings || {};
    }

    async init() {
        this.cacheElements();
        await this.loadData();
        this.bindEvents();
        this.render();
    }

    cacheElements() {
        // 缓存常用的DOM元素
        this.elements = {
            addPromptBtn: document.getElementById('promptAddBtn'),
            settingsBtn: document.getElementById('promptSettingsBtn'),
            exportBtn: document.getElementById('promptExportBtn'),
            importBtn: document.getElementById('promptImportBtn'),
            importFile: document.getElementById('promptImportFile'),
            categoryTabs: document.getElementById('promptCategoryTabs'),
            promptList: document.getElementById('promptList'),

            // 弹窗相关元素
            closeModalBtn: document.getElementById('promptCloseModalBtn'),
            cancelBtn: document.getElementById('promptCancelBtn'),
            closeRewriteBtn: document.getElementById('promptCloseRewriteBtn'),
            cancelRewriteBtn: document.getElementById('promptCancelRewriteBtn'),
            closeSettingsBtn: document.getElementById('promptCloseSettingsBtn'),
            cancelSettingsBtn: document.getElementById('promptCancelSettingsBtn'),
            saveSettingsBtn: document.getElementById('promptSaveSettingsBtn'),

            // 设置表单元素
            apiKey: document.getElementById('promptApiKey'),
            apiEndpoint: document.getElementById('promptApiEndpoint'),
            defaultModel: document.getElementById('promptDefaultModel')
        };
    }

    async loadData() {
        const data = await chrome.storage.local.get(this.STORAGE_KEYS);
        this.categories = data.promptCategories || ['全部'];
        this.prompts = data.promptPrompts || [];
        this.settings = data.promptSettings || {};
    }

    bindEvents() {
        // 使用缓存的DOM元素绑定事件
        this.elements.addPromptBtn?.addEventListener('click', () => {
            window.promptFormModalManager.openAddModal();
        });

        this.elements.settingsBtn?.addEventListener('click', () => {
            this.openSettingsModal();
        });

        this.elements.exportBtn?.addEventListener('click', () => {
            this.exportData();
        });

        this.elements.importBtn?.addEventListener('click', () => {
            this.elements.importFile?.click();
        });

        this.elements.importFile?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importData(file);
                e.target.value = ''; // 清空文件选择
            }
        });

        // 监听数据刷新事件
        document.addEventListener('prompts:refresh', () => {
            this.refresh();
        });

        // 绑定弹窗关闭按钮
        this.bindModalCloseEvents();
    }

    bindModalCloseEvents() {
        // 使用缓存的DOM元素和统一的事件处理
        const modalEvents = [
            { element: this.elements.closeModalBtn, action: () => window.promptModalManager.closeModal('promptModal') },
            { element: this.elements.cancelBtn, action: () => window.promptModalManager.closeModal('promptModal') },
            { element: this.elements.closeRewriteBtn, action: () => window.promptModalManager.closeModal('promptRewriteModal') },
            { element: this.elements.cancelRewriteBtn, action: () => window.promptModalManager.closeModal('promptRewriteModal') },
            { element: this.elements.closeSettingsBtn, action: () => window.promptModalManager.closeModal('promptSettingsModal') },
            { element: this.elements.cancelSettingsBtn, action: () => window.promptModalManager.closeModal('promptSettingsModal') },
            { element: this.elements.saveSettingsBtn, action: () => this.saveSettings() }
        ];

        modalEvents.forEach(({ element, action }) => {
            element?.addEventListener('click', action);
        });
    }

    render() {
        this.renderCategories();
        this.renderPrompts();
    }

    renderCategories() {
        if (!this.elements.categoryTabs) return;

        this.elements.categoryTabs.innerHTML = '';

        this.categories.forEach(category => {
            const tab = document.createElement('button');
            tab.className = 'prompt-category-tab';
            tab.textContent = category;

            if (category === this.currentCategory) {
                tab.classList.add('active');
            }

            tab.addEventListener('click', () => {
                this.currentCategory = category;
                this.render();
            });

            this.elements.categoryTabs.appendChild(tab);
        });
    }

    renderPrompts() {
        if (!this.elements.promptList) return;

        const filteredPrompts = this.currentCategory === '全部'
            ? this.prompts
            : this.prompts.filter(prompt => prompt.category === this.currentCategory);

        if (filteredPrompts.length === 0) {
            this.elements.promptList.innerHTML = `
                <div class="prompt-empty-state">
                    <div class="prompt-empty-icon">📝</div>
                    <div class="prompt-empty-title">暂无提示词</div>
                    <div class="prompt-empty-description">点击右上角的 + 按钮添加新的提示词</div>
                </div>
            `;
            return;
        }

        this.elements.promptList.innerHTML = '';

        filteredPrompts.forEach(prompt => {
            const card = this.createPromptCard(prompt);
            this.elements.promptList.appendChild(card);
        });
    }

    createPromptCard(prompt) {
        const card = document.createElement('div');
        card.className = 'prompt-card';

        const preview = prompt.content.length > 100
            ? prompt.content.substring(0, 100) + '...'
            : prompt.content;

        card.innerHTML = `
            <div class="prompt-card-content">
                <div class="prompt-card-title">${prompt.name}</div>
                <div class="prompt-card-preview">${preview}</div>
                <div class="prompt-card-meta">
                    <span class="prompt-card-category">${prompt.category || '未分类'}</span>
                    <span>${prompt.model || '默认模型'}</span>
                </div>
            </div>
            <div class="prompt-card-actions">
                <button class="prompt-action-btn primary" data-action="rewrite">改写</button>
                <button class="prompt-action-btn secondary" data-action="edit">编辑</button>
                <button class="prompt-action-btn danger" data-action="delete">删除</button>
            </div>
        `;

        // 绑定操作按钮事件
        card.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                e.stopPropagation();
                this.handlePromptAction(action, prompt);
            }
        });

        return card;
    }

    handlePromptAction(action, prompt) {
        switch (action) {
            case 'rewrite':
                window.promptRewriteModalManager.openRewriteModal(prompt);
                break;
            case 'edit':
                window.promptFormModalManager.openEditModal(prompt.id, prompt);
                break;
            case 'delete':
                this.deletePrompt(prompt.id);
                break;
        }
    }

    async deletePrompt(promptId) {
        if (!confirm('确定要删除这个提示词吗？')) {
            return;
        }

        try {
            this.prompts = this.prompts.filter(p => p.id !== promptId);
            await chrome.storage.local.set({ promptPrompts: this.prompts });
            this.render();
            PromptToastManager.show('删除成功', 'success');
        } catch (error) {
            console.error('删除失败:', error);
            PromptToastManager.show('删除失败', 'error');
        }
    }

    openSettingsModal() {
        // 填充当前设置
        if (this.elements.apiKey && this.settings.models?.[0]?.apiKey) {
            this.elements.apiKey.value = this.settings.models[0].apiKey;
        }
        if (this.elements.apiEndpoint && this.settings.models?.[0]?.endpoint) {
            this.elements.apiEndpoint.value = this.settings.models[0].endpoint;
        }

        // 加载模型选项
        this.loadModelOptions();

        window.promptModalManager.openModal('promptSettingsModal');
    }

    async loadModelOptions() {
        if (!this.elements.defaultModel) return;

        const models = this.settings.models || [];
        this.elements.defaultModel.innerHTML = '';

        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            this.elements.defaultModel.appendChild(option);
        });

        if (this.settings.defaultModel) {
            this.elements.defaultModel.value = this.settings.defaultModel;
        }
    }

    async saveSettings() {
        try {
            const apiKey = this.elements.apiKey?.value.trim() || '';
            const apiEndpoint = this.elements.apiEndpoint?.value.trim() || '';
            const defaultModel = this.elements.defaultModel?.value || '';

            if (!apiKey) {
                alert('请输入API Key');
                return;
            }

            // 更新设置
            const newSettings = {
                models: [{
                    id: 'gemini-2.5-flash',
                    name: 'Gemini 2.5 Flash',
                    apiKey: apiKey,
                    endpoint: apiEndpoint || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
                }],
                defaultModel: defaultModel || 'gemini-2.5-flash'
            };

            await chrome.storage.local.set({ promptSettings: newSettings });
            this.settings = newSettings;

            // 更新AI服务设置
            if (window.promptAIService) {
                await window.promptAIService.updateSettings(newSettings);
            }

            window.promptModalManager.closeModal('promptSettingsModal');
            PromptToastManager.show('设置保存成功', 'success');
        } catch (error) {
            console.error('保存设置失败:', error);
            PromptToastManager.show('保存设置失败', 'error');
        }
    }

    async exportData() {
        try {
            const data = {
                categories: this.categories,
                prompts: this.prompts,
                settings: this.settings,
                exportTime: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `prompt-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();

            URL.revokeObjectURL(url);
            PromptToastManager.show('导出成功', 'success');
        } catch (error) {
            console.error('导出失败:', error);
            PromptToastManager.show('导出失败', 'error');
        }
    }

    async importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.categories || !data.prompts) {
                throw new Error('数据格式不正确');
            }

            // 合并数据
            const newCategories = [...new Set([...this.categories, ...data.categories])];
            const newPrompts = [...this.prompts];

            // 添加新提示词（避免重复）
            data.prompts.forEach(prompt => {
                if (!newPrompts.find(p => p.id === prompt.id)) {
                    newPrompts.push({
                        ...prompt,
                        id: prompt.id || 'prompt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
                    });
                }
            });

            // 保存数据
            await chrome.storage.local.set({
                promptCategories: newCategories,
                promptPrompts: newPrompts,
                promptSettings: data.settings || this.settings
            });

            // 重新加载数据
            await this.loadData();
            this.render();

            PromptToastManager.show(`导入成功，新增 ${data.prompts.length} 个提示词`, 'success');
        } catch (error) {
            console.error('导入失败:', error);
            PromptToastManager.show('导入失败：' + error.message, 'error');
        }
    }

    async refresh() {
        await this.loadData();
        this.render();
    }
}

// 初始化应用
window.PromptToastManager = PromptToastManager;

// 等待DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.promptApp = new PromptApp();
    });
} else {
    window.promptApp = new PromptApp();
}

    bindModalCloseEvents() {
        // 使用缓存的DOM元素和统一的事件处理
        const modalEvents = [
            { element: this.elements.closeModalBtn, action: () => window.promptModalManager.closeModal('promptModal') },
            { element: this.elements.cancelBtn, action: () => window.promptModalManager.closeModal('promptModal') },
            { element: this.elements.closeRewriteBtn, action: () => window.promptModalManager.closeModal('promptRewriteModal') },
            { element: this.elements.cancelRewriteBtn, action: () => window.promptModalManager.closeModal('promptRewriteModal') },
            { element: this.elements.closeSettingsBtn, action: () => window.promptModalManager.closeModal('promptSettingsModal') },
            { element: this.elements.cancelSettingsBtn, action: () => window.promptModalManager.closeModal('promptSettingsModal') },
            { element: this.elements.saveSettingsBtn, action: () => this.saveSettings() }
        ];

        modalEvents.forEach(({ element, action }) => {
            element?.addEventListener('click', action);
        });
    }

    render() {
        this.renderCategories();
        this.renderPrompts();
    }

    renderCategories() {
        if (!this.elements.categoryTabs) return;

        this.elements.categoryTabs.innerHTML = '';

        this.categories.forEach(category => {
            const tab = document.createElement('button');
            tab.className = 'prompt-category-tab';
            tab.textContent = category;
            
            if (category === this.currentCategory) {
                tab.classList.add('active');
            }

            tab.addEventListener('click', () => {
                this.currentCategory = category;
                this.render();
            });

            this.elements.categoryTabs.appendChild(tab);
        });
    }

    renderPrompts() {
        if (!this.elements.promptList) return;

        const filteredPrompts = this.currentCategory === '全部' 
            ? this.prompts 
            : this.prompts.filter(prompt => prompt.category === this.currentCategory);

        if (filteredPrompts.length === 0) {
            this.elements.promptList.innerHTML = `
                <div class="prompt-empty-state">
                    <div class="prompt-empty-icon">📝</div>
                    <div class="prompt-empty-title">暂无提示词</div>
                    <div class="prompt-empty-description">点击右上角的 + 按钮添加新的提示词</div>
                </div>
            `;
            return;
        }

        this.elements.promptList.innerHTML = '';

        filteredPrompts.forEach(prompt => {
            const card = this.createPromptCard(prompt);
            this.elements.promptList.appendChild(card);
        });
    }

    createPromptCard(prompt) {
        const card = document.createElement('div');
        card.className = 'prompt-card';

        const preview = prompt.content.length > 100 
            ? prompt.content.substring(0, 100) + '...' 
            : prompt.content;

        card.innerHTML = `
            <div class="prompt-card-content">
                <div class="prompt-card-title">${prompt.name}</div>
                <div class="prompt-card-preview">${preview}</div>
                <div class="prompt-card-meta">
                    <span class="prompt-card-category">${prompt.category || '未分类'}</span>
                    <span>${prompt.model || '默认模型'}</span>
                </div>
            </div>
            <div class="prompt-card-actions">
                <button class="prompt-action-btn primary" data-action="rewrite">改写</button>
                <button class="prompt-action-btn secondary" data-action="edit">编辑</button>
                <button class="prompt-action-btn danger" data-action="delete">删除</button>
            </div>
        `;

        // 绑定操作按钮事件
        card.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                e.stopPropagation();
                this.handlePromptAction(action, prompt);
            }
        });

        return card;
    }

    handlePromptAction(action, prompt) {
        switch (action) {
            case 'rewrite':
                window.promptRewriteModalManager.openRewriteModal(prompt);
                break;
            case 'edit':
                window.promptFormModalManager.openEditModal(prompt.id, prompt);
                break;
            case 'delete':
                this.deletePrompt(prompt.id);
                break;
        }
    }

    async deletePrompt(promptId) {
        if (!confirm('确定要删除这个提示词吗？')) {
            return;
        }

        try {
            this.prompts = this.prompts.filter(p => p.id !== promptId);
            await chrome.storage.local.set({ promptPrompts: this.prompts });
            this.render();
            PromptToastManager.show('删除成功', 'success');
        } catch (error) {
            console.error('删除失败:', error);
            PromptToastManager.show('删除失败', 'error');
        }
    }

    openSettingsModal() {
        // 填充当前设置
        if (this.elements.apiKey && this.settings.models?.[0]?.apiKey) {
            this.elements.apiKey.value = this.settings.models[0].apiKey;
        }
        if (this.elements.apiEndpoint && this.settings.models?.[0]?.endpoint) {
            this.elements.apiEndpoint.value = this.settings.models[0].endpoint;
        }
        
        // 加载模型选项
        this.loadModelOptions();
        
        window.promptModalManager.openModal('promptSettingsModal');
    }

    async loadModelOptions() {
        if (!this.elements.defaultModel) return;

        const models = this.settings.models || [];
        this.elements.defaultModel.innerHTML = '';
        
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            this.elements.defaultModel.appendChild(option);
        });

        if (this.settings.defaultModel) {
            this.elements.defaultModel.value = this.settings.defaultModel;
        }
    }

    async saveSettings() {
        try {
            const apiKey = this.elements.apiKey?.value.trim() || '';
            const apiEndpoint = this.elements.apiEndpoint?.value.trim() || '';
            const defaultModel = this.elements.defaultModel?.value || '';

            if (!apiKey) {
                alert('请输入API Key');
                return;
            }

            // 更新设置
            const newSettings = {
                models: [{
                    id: 'gemini-2.5-flash',
                    name: 'Gemini 2.5 Flash',
                    apiKey: apiKey,
                    endpoint: apiEndpoint || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
                }],
                defaultModel: defaultModel || 'gemini-2.5-flash'
            };

            await chrome.storage.local.set({ promptSettings: newSettings });
            this.settings = newSettings;

            // 更新AI服务设置
            if (window.promptAIService) {
                await window.promptAIService.updateSettings(newSettings);
            }

            window.promptModalManager.closeModal('promptSettingsModal');
            PromptToastManager.show('设置保存成功', 'success');
        } catch (error) {
            console.error('保存设置失败:', error);
            PromptToastManager.show('保存设置失败', 'error');
        }
    }

    async exportData() {
        try {
            const data = {
                categories: this.categories,
                prompts: this.prompts,
                settings: this.settings,
                exportTime: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `prompt-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            PromptToastManager.show('导出成功', 'success');
        } catch (error) {
            console.error('导出失败:', error);
            PromptToastManager.show('导出失败', 'error');
        }
    }

    async importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.categories || !data.prompts) {
                throw new Error('数据格式不正确');
            }

            // 合并数据
            const newCategories = [...new Set([...this.categories, ...data.categories])];
            const newPrompts = [...this.prompts];

            // 添加新提示词（避免重复）
            data.prompts.forEach(prompt => {
                if (!newPrompts.find(p => p.id === prompt.id)) {
                    newPrompts.push({
                        ...prompt,
                        id: prompt.id || 'prompt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
                    });
                }
            });

            // 保存数据
            await chrome.storage.local.set({
                promptCategories: newCategories,
                promptPrompts: newPrompts,
                promptSettings: data.settings || this.settings
            });

            // 重新加载数据
            await this.loadData();
            this.render();

            PromptToastManager.show(`导入成功，新增 ${data.prompts.length} 个提示词`, 'success');
        } catch (error) {
            console.error('导入失败:', error);
            PromptToastManager.show('导入失败：' + error.message, 'error');
        }
    }

    async refresh() {
        await this.loadData();
        this.render();
    }
}

// 初始化应用
window.PromptToastManager = PromptToastManager;

// 等待DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.promptApp = new PromptApp();
    });
} else {
    window.promptApp = new PromptApp();
}
