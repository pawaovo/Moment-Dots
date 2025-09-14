// 后台脚本 - 处理扩展安装和侧边栏管理

chrome.runtime.onInstalled.addListener(async () => {
  // 初始化默认数据
  const defaultData = {
    categories: ['全部', '创意设计', '内容可视化', '学习提升'],
    prompts: [
      {
        id: 'prompt_1',
        name: '论文大师提示词',
        content: '你是一位资深的学术写作专家，请帮我改写以下内容，使其更加学术化、严谨且符合论文写作规范。请保持原意的同时，提升表达的专业性和逻辑性。',
        category: '学习提升',
        model: 'gemini-2.5-flash'
      },
      {
        id: 'prompt_2',
        name: '微信表情包提示词',
        content: '请将以下文字转换为适合微信聊天的表情包文案，要求生动有趣、朗朗上口，并适当添加emoji表情符号。\n\n原始内容：\n【用户输入内容】',
        category: '创意设计',
        model: 'gemini-2.5-flash'
      },
      {
        id: 'prompt_3',
        name: '平台文案转换提示词',
        content: '你是一名专业的文案策划和内容创作者，你的任务是将来自【A平台】的原始文案，改写成符合【B平台】发布习惯和用户喜好的新文案。\n\n请严格遵循以下规则进行改写：\n\n1. **保留核心信息**：确保新文案完整保留原始文案中的关键信息。\n2. **转换文案风格**：将原始文案中**直接描述提示词**的部分，直接改写为"**下面是提示词👇**"。\n3. **适配目标平台**：根据【B平台】的特点，优化文案的语言风格、排版和互动性，使之更具吸引力。\n\n**原始文案（来自【A平台】）：**\n【用户输入内容】\n\n**新文案（适合【B平台】）：**',
        category: '内容可视化',
        model: 'gemini-2.5-flash'
      }
    ],
    settings: {
      models: [
        {
          id: 'gemini-2.5-flash',
          name: 'Gemini 2.5 Flash',
          apiKey: 'AIzaSyDJ8RG1hMXCNWNlQ-uCzeCQCRq_RRx28Bc',
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
        }
      ],
      defaultModel: 'gemini-2.5-flash'
    }
  };

  // 检查是否已有数据，如果没有则初始化
  const existingData = await chrome.storage.local.get(['categories', 'prompts', 'settings']);
  
  if (!existingData.categories) {
    await chrome.storage.local.set({ categories: defaultData.categories });
  }
  
  if (!existingData.prompts) {
    await chrome.storage.local.set({ prompts: defaultData.prompts });
  }
  
  if (!existingData.settings) {
    await chrome.storage.local.set({ settings: defaultData.settings });
  }
});

// 处理扩展图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  // 打开侧边栏
  await chrome.sidePanel.open({ tabId: tab.id });
});

// 设置侧边栏为默认打开
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
