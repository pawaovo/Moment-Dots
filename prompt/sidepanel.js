// 全局Toast管理器
class ToastManager {
    static show(message, type = 'success') {
        // 移除现有的toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast';

        const bgColor = type === 'error' ? '#ef4444' : '#10b981';
        const icon = type === 'error' ? '❌' : '✅';

        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            animation: slideInRight 0.3s ease;
        `;

        toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 3000);
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

        // 统一的存储键名
        this.STORAGE_KEYS = ['categories', 'prompts', 'settings'];

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
            addPromptBtn: document.getElementById('addPromptBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            exportBtn: document.getElementById('exportBtn'),
            importBtn: document.getElementById('importBtn'),
            importFile: document.getElementById('importFile'),
            categoryTabs: document.getElementById('categoryTabs'),
            promptList: document.getElementById('promptList'),

            // 弹窗相关元素
            closeModalBtn: document.getElementById('closeModalBtn'),
            cancelBtn: document.getElementById('cancelBtn'),
            closeRewriteBtn: document.getElementById('closeRewriteBtn'),
            cancelRewriteBtn: document.getElementById('cancelRewriteBtn'),
            closeSettingsBtn: document.getElementById('closeSettingsBtn'),
            cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
            saveSettingsBtn: document.getElementById('saveSettingsBtn'),

            // 设置表单元素
            apiKey: document.getElementById('apiKey'),
            apiEndpoint: document.getElementById('apiEndpoint'),
            defaultModel: document.getElementById('defaultModel')
        };
    }

    async loadData() {
        const data = await chrome.storage.local.get(this.STORAGE_KEYS);
        this.categories = data.categories || ['全部'];
        this.prompts = data.prompts || [];
        this.settings = data.settings || {};
    }

    bindEvents() {
        // 使用缓存的DOM元素绑定事件
        this.elements.addPromptBtn?.addEventListener('click', () => {
            window.promptModalManager.openAddModal();
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
            { element: this.elements.closeModalBtn, action: () => window.modalManager.closeModal('promptModal') },
            { element: this.elements.cancelBtn, action: () => window.modalManager.closeModal('promptModal') },
            { element: this.elements.closeRewriteBtn, action: () => window.modalManager.closeModal('rewriteModal') },
            { element: this.elements.cancelRewriteBtn, action: () => window.modalManager.closeModal('rewriteModal') },
            { element: this.elements.closeSettingsBtn, action: () => window.modalManager.closeModal('settingsModal') },
            { element: this.elements.cancelSettingsBtn, action: () => window.modalManager.closeModal('settingsModal') },
            { element: this.elements.saveSettingsBtn, action: () => this.saveSettings() }
        ];

        modalEvents.forEach(({ element, action }) => {
            element?.addEventListener('click', action);
        });
    }

    async refresh() {
        await this.loadData();
        this.render();
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
            tab.className = `category-tab ${category === this.currentCategory ? 'active' : ''}`;
            tab.textContent = category;
            tab.addEventListener('click', () => {
                this.switchCategory(category);
            });
            this.elements.categoryTabs.appendChild(tab);
        });
    }

    renderPrompts() {
        if (!this.elements.promptList) return;

        const filteredPrompts = this.getFilteredPrompts();

        if (filteredPrompts.length === 0) {
            this.elements.promptList.innerHTML = this.renderEmptyState();
            return;
        }

        this.elements.promptList.innerHTML = '';
        filteredPrompts.forEach(prompt => {
            const card = this.createPromptCard(prompt);
            this.elements.promptList.appendChild(card);
        });
    }

    getFilteredPrompts() {
        if (this.currentCategory === '全部') {
            return this.prompts;
        }
        return this.prompts.filter(prompt => prompt.category === this.currentCategory);
    }

    createPromptCard(prompt) {
        const card = document.createElement('div');
        card.className = 'prompt-card';

        // 截取提示词内容预览
        const contentPreview = this.truncateText(prompt.content, 50);

        card.innerHTML = this.generateCardHTML(prompt, contentPreview);

        // 统一绑定卡片事件
        this.bindCardEvents(card, prompt);

        return card;
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    generateCardHTML(prompt, contentPreview) {
        return `
            <div class="prompt-info">
                <div class="prompt-name">${this.escapeHtml(prompt.name)}</div>
                <div class="prompt-preview">${this.escapeHtml(contentPreview)}</div>
                <div class="prompt-meta">
                    <span class="prompt-model">${this.escapeHtml(prompt.model || 'Default')}</span>
                    <span class="prompt-category">${this.escapeHtml(prompt.category || '未分类')}</span>
                </div>
            </div>
            <div class="prompt-actions">
                <button class="use-btn" data-prompt-id="${prompt.id}" title="使用此提示词改写文案">使用</button>
                <button class="edit-btn" data-prompt-id="${prompt.id}" title="编辑提示词">✏️</button>
                <button class="delete-btn" data-prompt-id="${prompt.id}" title="删除提示词">🗑️</button>
            </div>
        `;
    }

    bindCardEvents(card, prompt) {
        const actions = [
            { selector: '.use-btn', handler: () => this.openRewriteModal(prompt) },
            { selector: '.edit-btn', handler: () => this.openEditModal(prompt) },
            { selector: '.delete-btn', handler: () => this.deletePrompt(prompt) }
        ];

        actions.forEach(({ selector, handler }) => {
            const element = card.querySelector(selector);
            if (element) {
                element.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handler();
                });
            }
        });
    }

    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="icon">📝</div>
                <h3>暂无提示词</h3>
                <p>点击右上角的 + 按钮添加你的第一个提示词</p>
            </div>
        `;
    }

    switchCategory(category) {
        this.currentCategory = category;
        this.render();
    }

    openEditModal(prompt) {
        window.promptModalManager.openEditModal(prompt.id, prompt);
    }

    openRewriteModal(prompt) {
        window.rewriteModalManager.openRewriteModal(prompt);
    }

    async deletePrompt(prompt) {
        if (!confirm(`确定要删除提示词"${prompt.name}"吗？此操作不可撤销。`)) {
            return;
        }

        try {
            await this.updateStorageData('prompts', (prompts) =>
                prompts.filter(p => p.id !== prompt.id)
            );

            this.showToast('提示词删除成功');
            this.refresh();
        } catch (error) {
            console.error('删除提示词失败:', error);
            this.showToast('删除失败，请重试', 'error');
        }
    }

    // 通用的存储数据更新方法
    async updateStorageData(key, updateFn) {
        const data = await chrome.storage.local.get([key]);
        const currentData = data[key] || [];
        const updatedData = updateFn(currentData);
        await chrome.storage.local.set({ [key]: updatedData });
    }

    async openSettingsModal() {
        await this.loadSettingsData();
        window.modalManager.openModal('settingsModal');
    }

    async loadSettingsData() {
        const data = await chrome.storage.local.get(['settings']);
        const settings = data.settings || {};

        const defaultModel = settings.models?.[0] || {};

        if (this.elements.apiKey) {
            this.elements.apiKey.value = defaultModel.apiKey || '';
        }
        if (this.elements.apiEndpoint) {
            this.elements.apiEndpoint.value = defaultModel.endpoint || '';
        }

        // 加载模型选项
        if (this.elements.defaultModel) {
            this.elements.defaultModel.innerHTML = '';

            if (settings.models) {
                settings.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.name;
                    this.elements.defaultModel.appendChild(option);
                });

                if (settings.defaultModel) {
                    this.elements.defaultModel.value = settings.defaultModel;
                }
            }
        }
    }

    async saveSettings() {
        const apiKey = this.elements.apiKey?.value.trim() || '';
        const apiEndpoint = this.elements.apiEndpoint?.value.trim() || '';
        const defaultModel = this.elements.defaultModel?.value || '';

        if (!apiKey || !apiEndpoint) {
            alert('请填写完整的设置信息');
            return;
        }

        try {
            const data = await chrome.storage.local.get(['settings']);
            const settings = data.settings || { models: [] };
            
            // 更新第一个模型的配置
            if (settings.models.length > 0) {
                settings.models[0].apiKey = apiKey;
                settings.models[0].endpoint = apiEndpoint;
            }
            
            if (defaultModel) {
                settings.defaultModel = defaultModel;
            }

            await chrome.storage.local.set({ settings });
            
            // 更新AI服务配置
            await window.aiService.loadSettings();
            
            window.modalManager.closeModal('settingsModal');
            
            // 显示成功提示
            this.showToast('设置保存成功');
        } catch (error) {
            console.error('保存设置失败:', error);
            alert('保存设置失败，请重试');
        }
    }

    showToast(message, type = 'success') {
        window.ToastManager?.show(message, type);
    }

    // 添加导入导出功能
    async exportData() {
        try {
            const data = await chrome.storage.local.get(['prompts', 'categories', 'settings']);
            const exportData = {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                data: data
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `prompt-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url);
            this.showToast('数据导出成功');
        } catch (error) {
            console.error('导出失败:', error);
            this.showToast('导出失败，请重试', 'error');
        }
    }

    async importData(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            if (!importData.data) {
                throw new Error('无效的备份文件格式');
            }

            const { prompts, categories, settings } = importData.data;

            if (prompts) await chrome.storage.local.set({ prompts });
            if (categories) await chrome.storage.local.set({ categories });
            if (settings) await chrome.storage.local.set({ settings });

            this.showToast('数据导入成功');
            this.refresh();
        } catch (error) {
            console.error('导入失败:', error);
            this.showToast('导入失败，请检查文件格式', 'error');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 等待DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.ToastManager = ToastManager;
    window.promptApp = new PromptApp();
});
