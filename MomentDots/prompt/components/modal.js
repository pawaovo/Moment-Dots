// 弹窗管理模块 - 集成到MomentDots

class PromptModalManager {
    constructor() {
        this.modals = new Map();
        this.modalElements = new Map(); // 缓存模态框元素
        this.init();
    }

    init() {
        // 绑定所有弹窗的关闭事件
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        // ESC键关闭弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    getModalElement(modalId) {
        if (!this.modalElements.has(modalId)) {
            const modal = document.getElementById(modalId);
            if (modal) {
                this.modalElements.set(modalId, modal);
            }
        }
        return this.modalElements.get(modalId);
    }

    openModal(modalId, data = {}) {
        const modal = this.getModalElement(modalId);
        if (!modal) return;

        // 存储弹窗数据
        this.modals.set(modalId, data);

        // 显示弹窗
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // 触发打开事件
        this.triggerEvent(modalId, 'open', data);
    }

    closeModal(modalId) {
        const modal = this.getModalElement(modalId);
        if (!modal) return;

        modal.classList.remove('show');
        document.body.style.overflow = '';

        // 清理数据
        this.modals.delete(modalId);

        // 触发关闭事件
        this.triggerEvent(modalId, 'close');
    }

    closeAllModals() {
        document.querySelectorAll('.modal.show').forEach(modal => {
            this.closeModal(modal.id);
        });
    }

    getModalData(modalId) {
        return this.modals.get(modalId) || {};
    }

    triggerEvent(modalId, eventType, data = {}) {
        const event = new CustomEvent(`promptModal:${eventType}`, {
            detail: { modalId, data }
        });
        document.dispatchEvent(event);
    }
}

// 提示词弹窗管理器
class PromptFormModalManager {
    constructor(modalManager) {
        this.modalManager = modalManager;
        this.currentPromptId = null;
        this.elements = {};
        this.init();
    }

    init() {
        this.cacheElements();

        // 监听弹窗事件
        document.addEventListener('promptModal:open', (e) => {
            if (e.detail.modalId === 'promptModal') {
                this.handlePromptModalOpen(e.detail.data);
            }
        });

        // 绑定表单提交
        if (this.elements.form) {
            this.elements.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSavePrompt();
            });
        }
    }

    cacheElements() {
        this.elements = {
            form: document.getElementById('promptForm'),
            title: document.getElementById('modalTitle'),
            name: document.getElementById('promptName'),
            content: document.getElementById('promptContent'),
            category: document.getElementById('promptCategory'),
            model: document.getElementById('promptModel')
        };
    }

    openAddModal() {
        this.currentPromptId = null;
        this.modalManager.openModal('promptModal', { mode: 'add' });
    }

    openEditModal(promptId, promptData) {
        this.currentPromptId = promptId;
        this.modalManager.openModal('promptModal', { 
            mode: 'edit', 
            prompt: promptData 
        });
    }

    handlePromptModalOpen(data) {
        const { mode, prompt } = data;

        if (mode === 'edit' && prompt) {
            if (this.elements.title) {
                this.elements.title.textContent = '编辑提示词';
            }
            this.fillForm(prompt);
        } else {
            if (this.elements.title) {
                this.elements.title.textContent = '新增提示词';
            }
            if (this.elements.form) {
                this.elements.form.reset();
            }
        }

        // 加载模型选项
        this.loadModelOptions();
    }

    fillForm(prompt) {
        if (this.elements.name) this.elements.name.value = prompt.name || '';
        if (this.elements.content) this.elements.content.value = prompt.content || '';
        if (this.elements.category) this.elements.category.value = prompt.category || '';
        if (this.elements.model) this.elements.model.value = prompt.model || '';
    }

    async loadModelOptions() {
        if (!this.elements.model) return;

        const data = await chrome.storage.local.get(['promptSettings']);
        const settings = data.promptSettings || {};
        const models = settings.models || [];

        this.elements.model.innerHTML = '';
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            this.elements.model.appendChild(option);
        });

        // 设置默认选中
        if (settings.defaultModel) {
            this.elements.model.value = settings.defaultModel;
        }
    }

    async handleSavePrompt() {
        const formData = {
            name: this.elements.name?.value.trim() || '',
            content: this.elements.content?.value.trim() || '',
            category: this.elements.category?.value.trim() || '全部',
            model: this.elements.model?.value || ''
        };

        // 验证必填字段
        if (!formData.name || !formData.content) {
            alert('请填写必填字段');
            return;
        }

        try {
            if (this.currentPromptId) {
                await this.updatePrompt(this.currentPromptId, formData);
            } else {
                await this.createPrompt(formData);
            }

            this.modalManager.closeModal('promptModal');
            
            // 触发刷新事件
            document.dispatchEvent(new CustomEvent('prompts:refresh'));
        } catch (error) {
            console.error('保存提示词失败:', error);
            alert('保存失败，请重试');
        }
    }

    async createPrompt(formData) {
        const data = await chrome.storage.local.get(['promptPrompts', 'promptCategories']);
        const prompts = data.promptPrompts || [];
        const categories = data.promptCategories || [];

        // 生成新ID
        const newPrompt = {
            id: 'prompt_' + Date.now(),
            ...formData,
            createdAt: new Date().toISOString()
        };

        prompts.push(newPrompt);

        // 添加新分类（如果不存在）
        if (formData.category && !categories.includes(formData.category)) {
            categories.push(formData.category);
        }

        await chrome.storage.local.set({ promptPrompts: prompts, promptCategories: categories });
    }

    async updatePrompt(promptId, formData) {
        const data = await chrome.storage.local.get(['promptPrompts', 'promptCategories']);
        const prompts = data.promptPrompts || [];
        const categories = data.promptCategories || [];

        const index = prompts.findIndex(p => p.id === promptId);
        if (index !== -1) {
            prompts[index] = {
                ...prompts[index],
                ...formData,
                updatedAt: new Date().toISOString()
            };

            // 添加新分类（如果不存在）
            if (formData.category && !categories.includes(formData.category)) {
                categories.push(formData.category);
            }

            await chrome.storage.local.set({ promptPrompts: prompts, promptCategories: categories });
        }
    }
}

// AI改写弹窗管理器
class PromptRewriteModalManager {
    constructor(modalManager) {
        this.modalManager = modalManager;
        this.currentPrompt = null;
        this.elements = {};
        this.init();
    }

    init() {
        this.cacheElements();

        // 监听弹窗事件
        document.addEventListener('promptModal:open', (e) => {
            if (e.detail.modalId === 'promptRewriteModal') {
                this.handleRewriteModalOpen(e.detail.data);
            }
        });

        // 绑定改写按钮
        if (this.elements.rewriteBtn) {
            this.elements.rewriteBtn.addEventListener('click', () => this.handleRewrite());
        }

        // 绑定复制按钮
        if (this.elements.copyBtn) {
            this.elements.copyBtn.addEventListener('click', () => this.copyResult());
        }
    }

    cacheElements() {
        this.elements = {
            originalText: document.getElementById('promptOriginalText'),
            rewrittenText: document.getElementById('promptRewrittenText'),
            rewriteBtn: document.getElementById('promptRewriteBtn'),
            copyBtn: document.getElementById('promptCopyResultBtn'),
            loadingIndicator: document.getElementById('promptLoadingIndicator')
        };
    }

    openRewriteModal(prompt) {
        this.currentPrompt = prompt;
        this.modalManager.openModal('promptRewriteModal', { prompt });
    }

    handleRewriteModalOpen(data) {
        const { prompt } = data;

        // 重置表单
        if (this.elements.originalText) this.elements.originalText.value = '';
        if (this.elements.rewrittenText) this.elements.rewrittenText.value = '';
        if (this.elements.copyBtn) this.elements.copyBtn.style.display = 'none';
        if (this.elements.loadingIndicator) this.elements.loadingIndicator.style.display = 'none';
    }

    async handleRewrite() {
        const originalText = this.elements.originalText?.value.trim() || '';

        if (!originalText) {
            alert('请输入需要改写的文案内容');
            return;
        }

        if (!this.currentPrompt) {
            alert('提示词信息丢失，请重新打开');
            return;
        }

        if (!this.currentPrompt.content) {
            alert('提示词内容为空，请检查提示词配置');
            return;
        }

        try {
            // 显示加载状态
            if (this.elements.loadingIndicator) this.elements.loadingIndicator.style.display = 'flex';
            if (this.elements.rewriteBtn) this.elements.rewriteBtn.disabled = true;
            if (this.elements.rewrittenText) this.elements.rewrittenText.value = '';
            if (this.elements.copyBtn) this.elements.copyBtn.style.display = 'none';

            // 确保AI服务已初始化
            if (!window.promptAIService && window.createPromptAIService) {
                window.createPromptAIService();
            }

            if (!window.promptAIService) {
                throw new Error('AI服务未初始化，请刷新页面重试');
            }

            // 调用AI API
            const result = await window.promptAIService.rewriteText(
                originalText,
                this.currentPrompt.content,
                this.currentPrompt.model
            );

            // 显示结果
            if (this.elements.rewrittenText) {
                this.elements.rewrittenText.value = result;
            }
            if (this.elements.copyBtn) {
                this.elements.copyBtn.style.display = 'inline-block';
            }

            // 显示成功提示
            window.PromptToastManager?.show('改写完成！', 'success');

        } catch (error) {
            console.error('改写失败:', error);

            // 更详细的错误处理
            let errorMessage = '改写失败';
            if (error.message.includes('API Key')) {
                errorMessage = '请先在设置中配置正确的 API Key';
            } else if (error.message.includes('网络')) {
                errorMessage = '网络连接失败，请检查网络连接';
            } else if (error.message.includes('格式错误')) {
                errorMessage = 'API 响应格式错误，请稍后重试';
            } else {
                errorMessage = `改写失败: ${error.message}`;
            }

            if (this.elements.rewrittenText) {
                this.elements.rewrittenText.value = errorMessage;
            }

            window.PromptToastManager?.show(errorMessage, 'error');
        } finally {
            // 隐藏加载状态
            if (this.elements.loadingIndicator) this.elements.loadingIndicator.style.display = 'none';
            if (this.elements.rewriteBtn) this.elements.rewriteBtn.disabled = false;
        }
    }

    async copyResult() {
        const resultText = this.elements.rewrittenText?.value || '';

        if (!resultText) {
            alert('没有可复制的内容');
            return;
        }

        try {
            await navigator.clipboard.writeText(resultText);

            // 临时改变按钮文字
            if (this.elements.copyBtn) {
                const originalText = this.elements.copyBtn.textContent;
                this.elements.copyBtn.textContent = '已复制!';

                setTimeout(() => {
                    if (this.elements.copyBtn) {
                        this.elements.copyBtn.textContent = originalText;
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('复制失败:', error);
            alert('复制失败，请手动复制');
        }
    }
}

// 延迟创建全局实例
window.promptModalManager = null;
window.promptFormModalManager = null;
window.promptRewriteModalManager = null;

// 创建实例的函数
function createPromptModalManagers() {
    if (!window.promptModalManager) {
        window.promptModalManager = new PromptModalManager();
        window.promptFormModalManager = new PromptFormModalManager(window.promptModalManager);
        window.promptRewriteModalManager = new PromptRewriteModalManager(window.promptModalManager);
    }
    return {
        modalManager: window.promptModalManager,
        formModalManager: window.promptFormModalManager,
        rewriteModalManager: window.promptRewriteModalManager
    };
}

// 导出创建函数
window.createPromptModalManagers = createPromptModalManagers;
