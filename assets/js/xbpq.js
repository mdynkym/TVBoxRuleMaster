/**
 * --------------------------------------------------------------------
 * @description     XBPQ规则编辑器核心脚本
 * @author      https://t.me/CCfork
 * @copyright   Copyright (c) 2025, https://t.me/CCfork
 * @update      2025-08-28 xMydev
 * --------------------------------------------------------------------
 */

document.addEventListener('DOMContentLoaded', () => {
    Handlebars.registerHelper('eq', (a, b) => a === b);
    if (typeof xbpqFieldsData === 'undefined' || typeof Modal === 'undefined' || typeof Handlebars === 'undefined') {
        alert('核心JS库（el.js, utils.js, handlebars.js）未加载，无法渲染编辑器。');
        return;
    }

    let currentTestFieldId = null;
    let lastResultData = [];
    let isHtmlMode = false;
    
    /**
     * @description 编码映射表
     */
    const ENCODING_MAP = {
        'utf-8': 'UTF-8',
        'UTF-8': 'UTF-8',
        'gbk': 'GBK',
        'GBK': 'GBK',
        'gb2312': 'GB2312',
        'GB2312': 'GB2312',
        'big5': 'Big5',
        'Big5': 'Big5',
        'iso-8859-1': 'ISO-8859-1'
    };

    /**
     * @description 搜索模式常量
     */
    const SEARCH_MODE = {
        STANDARD: 0,    // 标准截取模式
        REGEX: 1,       // 正则模式
        XPATH: 2,       // XPath模式
        JSON: 3         // JSON模式
    };

    /**
     * @description 规则解析器
     * @param {string} source - 源文本
     * @param {string} rule - XBPQ规则
     * @param {number} searchMode - 搜索模式（0=标准，1=正则）
     * @returns {string|Array} 解析结果
     */
    function parseRule(source, rule, searchMode = 0) {
        if (!rule || !source) return source;

        try {
            // 处理编码声明
            const encodingMatch = rule.match(/编码[:：]([^#\s]+)/);
            if (encodingMatch) {
                const encoding = encodingMatch[1].trim();
                console.log(`检测到编码声明: ${encoding}`);
                const targetEncoding = ENCODING_MAP[encoding] || 'UTF-8';
                try {
                    if (typeof TextDecoder !== 'undefined') {
                        // 在浏览器环境中处理编码
                    }
                } catch (e) {
                    console.warn('编码转换失败，使用默认UTF-8:', e);
                }
            }

            // 处理搜索模式声明
            const searchModeMatch = rule.match(/搜索模式[:：]?(\d+)/);
            if (searchModeMatch) {
                searchMode = parseInt(searchModeMatch[1]);
                console.log(`搜索模式: ${searchMode}`);
            }

            // 移除模式声明，获取纯规则
            rule = rule.replace(/编码[:：][^#\s]*#?/g, '')
                    .replace(/搜索模式[:：]?\d+#?/g, '')
                    .trim();

            if (!rule) return source;

            // 处理连接符
            rule = processConnectionOperators(rule);

            // 根据搜索模式分发处理
            switch (searchMode) {
                case SEARCH_MODE.STANDARD:
                    return processStandardMode(source, rule);
                case SEARCH_MODE.REGEX:
                    return processRegexMode(source, rule);
                case SEARCH_MODE.XPATH:
                    return processXPathMode(source, rule);
                case SEARCH_MODE.JSON:
                    return processJsonMode(source, rule);
                default:
                    return processStandardMode(source, rule);
            }
        } catch (e) {
            console.error('解析规则时发生错误:', e);
            return source;
        }
    }

    /**
     * @description 处理连接操作符
     * @param {string} rule - 规则字符串
     * @returns {string} 处理后的规则
     */
    function processConnectionOperators(rule) {
        if (rule.includes('&&')) {
            let [left, right] = rule.split('&&');
            
            // 处理左侧的+号拼接
            if (left && left.includes('+')) {
                const leftParts = left.split('+');
                left = leftParts.join('');
            }
            
            // 处理右侧的+号拼接
            if (right && right.includes('+')) {
                const rightParts = right.split('+');
                right = rightParts.join('');
            }
            
            rule = (left || '') + '&&' + (right || '');
        } else if (rule.includes('+')) {
            // 处理单独的+号拼接
            const parts = rule.split('+');
            return parts.join('');
        }
        
        return rule;
    }

    /**
     * @description 标准截取模式
     * @param {string} source - 源文本
     * @param {string} rule - 规则
     * @returns {string|Array} 结果
     */
    function processStandardMode(source, rule) {
        // 数组规则处理
        if (rule.includes('&&</')) {
            return extractTagArrays(source, rule);
        }

        // 属性批量提取
        const attrMatch = rule.match(/^([^\s=]+)=["']&&["']$/);
        if (attrMatch) {
            return extractAttributes(source, attrMatch[1]);
        }

        // 标签内容批量提取
        const tagMatch = rule.match(/^<([a-zA-Z0-9]+)[^>]*>&&<\/\1>$/);
        if (tagMatch) {
            return extractTagContents(source, tagMatch[1]);
        }

        // 通用&&截取
        if (rule.includes('&&')) {
            return performStringExtraction(source, rule);
        }

        // 默认分割
        return source.split(rule);
    }

    /**
     * @description 正则模式处理
     * @param {string} source - 源文本
     * @param {string} rule - 正则规则
     * @returns {Array} 匹配结果
     */
    function processRegexMode(source, rule) {
        try {
            const parts = rule.split('&&');
            let pattern;
            
            if (parts.length === 2) {
                // 构建正则模式：前缀 + 捕获组 + 后缀
                pattern = escapeRegexSpecialChars(parts[0]) + 
                         '([\\s\\S]*?)' + 
                         escapeRegexSpecialChars(parts[1] || '');
            } else {
                // 直接使用规则作为正则
                pattern = rule;
            }

            try {
                const regex = new RegExp(pattern, 'g');
                const matches = [];
                let match;
                
                while ((match = regex.exec(source)) !== null) {
                    // 优先返回捕获组，否则返回整个匹配
                    matches.push(match[1] || match[0]);
                    // 防止无限循环
                    if (!regex.global) break;
                }
                
                return matches.length > 0 ? matches : [];
            } catch (regexError) {
                console.error('正则执行失败:', regexError);
                return [];
            }
        } catch (e) {
            console.error('正则模式解析失败:', e);
            // 降级到标准模式
            return processStandardMode(source, rule);
        }
    }

    /**
     * @description XPath模式处理
     * @param {string} source - 源HTML
     * @param {string} rule - XPath规则
     * @returns {Array} 结果
     */
    function processXPathMode(source, rule) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(source, 'text/html');
            const result = doc.evaluate(rule, doc, null, XPathResult.ANY_TYPE, null);
            const elements = [];
            let node;
            
            while ((node = result.iterateNext())) {
                if (node.nodeType === Node.TEXT_NODE) {
                    elements.push(node.nodeValue);
                } else if (node.nodeType === Node.ATTRIBUTE_NODE) {
                    elements.push(node.value);
                } else {
                    elements.push(node.textContent || node.outerHTML);
                }
            }
            
            return elements;
        } catch (e) {
            console.error('XPath模式解析失败:', e);
            return [];
        }
    }

    /**
     * @description JSON模式处理
     * @param {string} source - JSON字符串
     * @param {string} rule - JSON路径
     * @returns {*} 结果
     */
    function processJsonMode(source, rule) {
        try {
            const json = JSON.parse(source);
            const paths = rule.split('.');
            let result = json;
            
            for (const path of paths) {
                if (path.includes('[') && path.includes(']')) {
                    // 数组索引处理
                    const [key, indexStr] = path.split('[');
                    const index = parseInt(indexStr.replace(']', ''));
                    result = result[key]?.[index];
                } else {
                    result = result[path];
                }
                
                if (result === undefined) break;
            }
            
            return result;
        } catch (e) {
            console.error('JSON模式解析失败:', e);
            return source;
        }
    }

    /**
     * @description 转义正则特殊字符
     * @param {string} str - 输入字符串
     * @returns {string} 转义后的字符串
     */
    function escapeRegexSpecialChars(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * @description 提取标签数组
     * @param {string} source - 源HTML
     * @param {string} rule - 规则
     * @returns {Array} 标签数组
     */
    function extractTagArrays(source, rule) {
        // 支持多种标签的数组提取
        const tagPatterns = [
            { pattern: '&&</a>', tag: 'a' },
            { pattern: '&&</li>', tag: 'li' },
            { pattern: '&&</div>', tag: 'div' },
            { pattern: '&&</span>', tag: 'span' },
            { pattern: '&&</p>', tag: 'p' },
            { pattern: '&&</h1>', tag: 'h1' },
            { pattern: '&&</h2>', tag: 'h2' },
            { pattern: '&&</h3>', tag: 'h3' },
            { pattern: '&&</h4>', tag: 'h4' },
            { pattern: '&&</h5>', tag: 'h5' },
            { pattern: '&&</h6>', tag: 'h6' },
            { pattern: '&&</td>', tag: 'td' },
            { pattern: '&&</tr>', tag: 'tr' },
            { pattern: '&&</dl>', tag: 'dl' },
            { pattern: '&&</dt>', tag: 'dt' },
            { pattern: '&&</dd>', tag: 'dd' },
            { pattern: '&&</ul>', tag: 'ul' },
            { pattern: '&&</ol>', tag: 'ol' }
        ];

        for (const { pattern, tag } of tagPatterns) {
            if (rule.includes(pattern)) {
                return extractTagArray(source, rule, tag);
            }
        }

        return [];
    }

    /**
     * @description 提取特定标签的数组
     * @param {string} source - 源HTML
     * @param {string} rule - 规则
     * @param {string} tagName - 标签名
     * @returns {Array} 提取结果
     */
    function extractTagArray(source, rule, tagName) {
        const [start] = rule.split('&&');
        const arr = [];
        let idx = 0;
        const endTag = `</${tagName}>`;
        
        while ((idx = source.indexOf(start, idx)) !== -1) {
            let end = source.indexOf(endTag, idx);
            if (end === -1) break;
            
            const content = source.substring(idx, end + endTag.length);
            
            // 验证是否为有效的标签内容
            if (content.includes(`<${tagName}`) || content.startsWith(start)) {
                arr.push(content);
            }
            
            idx = end + endTag.length;
        }
        
        return arr;
    }

    /**
     * @description 提取属性值
     * @param {string} source - 源HTML
     * @param {string} attr - 属性名
     * @returns {Array} 属性值数组
     */
    function extractAttributes(source, attr) {
        // 支持多种属性值格式
        const patterns = [
            new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, 'gi'),
            new RegExp(`${attr}\\s*=\\s*'([^']*)'`, 'gi'),
            new RegExp(`${attr}\\s*=\\s*([^\\s>]+)`, 'gi')
        ];
        
        const result = [];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(source)) !== null) {
                if (match[1] && !result.includes(match[1])) {
                    result.push(match[1]);
                }
            }
        }
        
        return result.length > 0 ? result : [];
    }

    /**
     * @description 提取标签内容
     * @param {string} source - 源HTML
     * @param {string} tag - 标签名
     * @returns {Array} 内容数组
     */
    function extractTagContents(source, tag) {
        const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
        const result = [];
        let match;
        
        while ((match = pattern.exec(source)) !== null) {
            const content = match[1].trim();
            if (content) {
                result.push(content);
            }
        }
        
        return result.length > 0 ? result : [];
    }

    /**
     * @description 执行字符串截取
     * @param {string} source - 源字符串
     * @param {string} rule - 截取规则
     * @returns {string} 截取结果
     */
    function performStringExtraction(source, rule) {
        const parts = rule.split('&&');
        let result = source;
        
        // 处理前置截取，支持+号拼接
        if (parts[0]) {
            let searchStr = parts[0];
            
            // 如果包含+号，需要处理拼接逻辑
            if (searchStr.includes('+')) {
                const segments = searchStr.split('+');
                let tempResult = result;
                
                // 依次查找每个片段
                for (const segment of segments) {
                    if (segment) {
                        const index = tempResult.indexOf(segment);
                        if (index === -1) return '';
                        tempResult = tempResult.substring(index + segment.length);
                    }
                }
                result = tempResult;
            } else {
                const index1 = result.indexOf(searchStr);
                if (index1 === -1) return '';
                result = result.substring(index1 + searchStr.length);
            }
        }
        
        // 处理后置截取，支持+号拼接
        if (parts[1]) {
            let searchStr = parts[1];
            
            // 如果包含+号，需要处理拼接逻辑
            if (searchStr.includes('+')) {
                const segments = searchStr.split('+');
                let searchTarget = '';
                
                // 构建完整的搜索目标
                for (const segment of segments) {
                    if (segment) {
                        const index = result.indexOf(segment, searchTarget.length);
                        if (index === -1) return result; // 找不到则返回当前结果
                        searchTarget = result.substring(0, index);
                    }
                }
                result = searchTarget;
            } else {
                const index2 = result.indexOf(searchStr);
                if (index2 === -1) return '';
                result = result.substring(0, index2);
            }
        }
        
        return result;
    }

    /**
     * @description 应用自定义语法
     * @param {*} data - 输入数据
     * @param {string} syntaxStr - 语法字符串
     * @returns {*} 处理后的数据
     */
    function applyCustomSyntaxes(data, syntaxStr) {
        if (!syntaxStr) return data;
        
        // 提取所有语法标记
        const syntaxes = syntaxStr.match(/\[.*?\]/g) || [];
        let result = data;
        
        // 按顺序应用每个语法
        for (const syntax of syntaxes) {
            const match = syntax.match(/\[([^:\]]+):?([^\]]*)\]/);
            if (!match) continue;
            
            const key = match[1];
            const value = match[2] || '';
            
            if (Array.isArray(result)) {
                result = processArraySyntax(result, key, value);
            } else if (typeof result === 'string') {
                result = processStringSyntax(result, key, value);
            }
        }
        
        return result;
    }

    /**
     * @description 处理数组语法
     * @param {Array} result - 数组数据
     * @param {string} key - 操作类型
     * @param {string} value - 操作参数
     * @returns {Array} 处理后的数组
     */
    function processArraySyntax(result, key, value) {
        switch(key) {
            case '包含':
                // 包含所有关键词
                return result.filter(item => 
                    value.split('&').every(kw => item.includes(kw))
                );
                
            case '不包含':
                // 不包含任一关键词
                return result.filter(item => 
                    !value.split('&').some(kw => item.includes(kw))
                );
                
            case '过滤':
                // 正则过滤
                try {
                    const regex = new RegExp(value, 'i');
                    return result.filter(item => regex.test(item));
                } catch (e) {
                    console.error('过滤正则错误:', e);
                    return result;
                }
                
            case '倒序':
                // 数组倒序
                return [...result].reverse();
                
            case '首尾':
                // 只保留首尾元素
                return result.length > 1 ? [result[0], result[result.length - 1]] : result;
                
            case '去重':
                // 数组去重
                return [...new Set(result)];
                
            default:
                return result;
        }
    }

    /**
     * @description 处理字符串语法
     * @param {string} result - 字符串数据
     * @param {string} key - 操作类型
     * @param {string} value - 操作参数
     * @returns {string} 处理后的字符串
     */
    function processStringSyntax(result, key, value) {
        switch(key) {
            case '替换':
                // 多重替换：old1=>new1&old2=>new2
                value.split('&').forEach(rep => {
                    const parts = rep.split('=>');
                    if (parts.length === 2) {
                        result = result.replaceAll(parts[0], parts[1]);
                    }
                });
                return result;
                
            case '截取':
                // 嵌套截取
                return parseRule(result, value);
                
            case '前缀':
                // 添加前缀
                return value + result;
                
            case '后缀':
            case '连接':
                // 添加后缀
                return result + value;
                
            case '移除':
                // 移除指定内容
                return result.replaceAll(value, '');
                
            case '大写':
                // 转大写
                return result.toUpperCase();
                
            case '小写':
                // 转小写
                return result.toLowerCase();
                
            case '去空格':
                // 去除所有空格
                return result.replace(/\s+/g, '');
                
            case '整理空格':
                // 整理多余空格
                return result.replace(/\s+/g, ' ').trim();
                
            case 'URL解码':
                // URL解码
                try {
                    return decodeURIComponent(result);
                } catch (e) {
                    return result;
                }
                
            case 'URL编码':
                // URL编码
                try {
                    return encodeURIComponent(result);
                } catch (e) {
                    return result;
                }
                
            default:
                return result;
        }
    }

    /**
     * @description 智能规则解析
     * @param {string} source - 源文本
     * @param {string} rule - 规则
     * @param {Object} fieldDef - 字段定义
     * @returns {Array} 解析结果
     */
    function smartParseRule(source, rule, fieldDef) {
        // 检测搜索模式
        let searchMode = SEARCH_MODE.STANDARD;
        if (rule.includes('搜索模式')) {
            const modeMatch = rule.match(/搜索模式[:：]?(\d+)/);
            if (modeMatch) {
                searchMode = parseInt(modeMatch[1]);
            }
        }

        // 判断是否为数组字段
        const isArrayField = fieldDef && (
            (typeof fieldDef.type === 'string' && fieldDef.type.toLowerCase() === 'array') ||
            /数组|组|列表/.test(fieldDef.key) ||
            fieldDef.id.includes('数组') ||
            fieldDef.id.includes('列表') ||
            fieldDef.key.includes('数组') ||
            fieldDef.key.includes('列表')
        );

        // 分离主规则和语法规则
        const syntaxMatch = rule.match(/(\[.*?\])+$/);
        const mainRule = syntaxMatch ? rule.replace(syntaxMatch[0], '').trim() : rule;
        const syntaxPart = syntaxMatch ? syntaxMatch[0] : '';

        // 解析主规则
        const parseResult = parseRule(source, mainRule, searchMode);
        
        // 应用自定义语法
        const processedResult = syntaxPart ? 
            applyCustomSyntaxes(parseResult, syntaxPart) : parseResult;

        // 标准化返回格式
        if (Array.isArray(processedResult)) {
            if (isArrayField) {
                return processedResult;
            } else {
                // 非数组字段只返回第一个结果
                return processedResult.length > 0 ? [processedResult[0]] : [];
            }
        } else {
            // 单值结果
            if (isArrayField) {
                return processedResult ? [processedResult] : [];
            } else {
                return processedResult ? [processedResult] : [];
            }
        }
    }

    /**
     * @description 运行测试
     * @param {string} source - 源文本
     * @param {string|Array} ruleChain - 规则链或单规则
     * @returns {Object} 测试结果
     */
    function runTest(source, ruleChain) {
        // 兼容单规则和规则链
        let chain;
        if (typeof ruleChain === 'string') {
            // 单规则，构造简单链
            chain = [{ id: 'single', key: '单规则', rule: ruleChain, type: 'string' }];
        } else if (Array.isArray(ruleChain)) {
            chain = ruleChain;
        } else {
            return { success: false, data: [], error: '无效的规则链格式' };
        }

        let context = [source];
        
        for (let i = 0; i < chain.length; i++) {
            const step = chain[i];
            if (!step.rule) {
                console.log(`步骤 ${i + 1} (${step.key}): 规则为空，跳过`);
                continue;
            }

            let nextContext = [];
            
            // 对每个上下文项执行当前步骤
            context.forEach(item => {
                try {
                    const result = smartParseRule(item, step.rule, step);
                    if (Array.isArray(result)) {
                        nextContext.push(...result);
                    } else if (result) {
                        nextContext.push(result);
                    }
                } catch (e) {
                    console.error(`步骤 ${i + 1} 执行出错:`, e);
                }
            });
            
            context = nextContext;
            
            // 调试信息
            console.log(`步骤 ${i + 1} (${step.key}): 找到 ${context.length} 个结果`);
            
            // 如果中间步骤无结果，提前终止
            if (context.length === 0) {
                console.log(`规则链在步骤 ${i + 1} (${step.key}) 处中断`);
                break;
            }
        }
        
        return { 
            success: context.length > 0, 
            data: context,
            error: context.length === 0 ? '规则链执行无结果' : null
        };
    }

    /**
     * @description 构建测试URL
     * @returns {string|Object} URL字符串或POST请求对象
     */
    function buildTestUrl() {
        if (!currentTestFieldId) return '';
        
        const fieldDef = findFieldDefinition(xbpqFieldsData, currentTestFieldId);
        if (!fieldDef) return '';
        
        const tabId = document.querySelector(`[for="${currentTestFieldId}"]`)?.closest('.tab-content').id;
        
        function getRealtimeVariable(key, defaultValue = '') {
            try {
                const savedData = localStorage.getItem('global_variables');
                if (savedData) {
                    const variables = JSON.parse(savedData);
                    return variables[key] !== undefined ? variables[key] : defaultValue;
                }
                return defaultValue;
            } catch (e) {
                console.warn('读取全局变量失败:', e);
                return defaultValue;
            }
        }
        
        function processUrlVariablesRealtime(url) {
            if (!url) return url;
            
            try {
                const savedData = localStorage.getItem('global_variables');
                if (savedData) {
                    const variables = JSON.parse(savedData);
                    for (const key in variables) {
                        if (variables[key] !== undefined && variables[key] !== '') {
                            url = url.replace(new RegExp(`\\{${key}\\}`, 'g'), variables[key]);
                        }
                    }
                }
            } catch (e) {
                console.warn('实时变量替换失败:', e);
            }
            
            return url;
        }
        
        if (tabId === 'category' || (fieldDef.dependsOn && findFieldDefinition(xbpqFieldsData, fieldDef.dependsOn)?.id.startsWith('分类'))) {
            let url = document.getElementById('分类url')?.value || '';
            const cateNames = document.getElementById('分类')?.value || '';
            
            if (url && cateNames) {
                const firstCate = cateNames.split('#')[0];
                const defaultCateId = firstCate.includes('$') ? firstCate.split('$')[1] : '1';
                
                const cateId = getRealtimeVariable('cateId', defaultCateId);
                const catePg = getRealtimeVariable('catePg', '1');
                
                if (url.includes(';post;')) {
                    const postObj = handlePostUrl(url, { cateId, catePg });
                    if (typeof postObj === 'object') {
                        postObj.url = processUrlVariablesRealtime(postObj.url);
                        return postObj;
                    }
                    return processUrlVariablesRealtime(postObj);
                }
                
                url = url.replace('{cateId}', cateId).replace('{catePg}', catePg);
                
                url = url.replace(/\{(class|area|year|by|lang)\}/g, (match, varName) => {
                    return getRealtimeVariable(varName, '');
                });
                
                url = processUrlVariablesRealtime(url);
                return url;
            }
        }
        
        if (tabId === 'search') {
            let url = document.getElementById('搜索url')?.value || '';
            if (url) {
                if (url.includes(';post;')) {
                    const wd = getRealtimeVariable('wd', 'test');
                    const searchPg = getRealtimeVariable('SearchPg', '1');
                    const postObj = handlePostUrl(url, { wd, SearchPg: searchPg });
                    if (typeof postObj === 'object') {
                        postObj.url = processUrlVariablesRealtime(postObj.url);
                        return postObj;
                    }
                    return processUrlVariablesRealtime(postObj);
                }
                
                const wd = getRealtimeVariable('wd', 'test');
                const searchPg = getRealtimeVariable('SearchPg', '1');
                
                url = url.replace('{wd}', wd).replace('{SearchPg}', searchPg);
                
                url = processUrlVariablesRealtime(url);
                return url.split(';post')[0];
            }
        }
        
        if (tabId === 'detail' || tabId === 'play') {
            const baseUrl = document.getElementById('主页url')?.value || '';
            return processUrlVariablesRealtime(baseUrl);
        }
        
        const baseUrl = document.getElementById('主页url')?.value || '';
        return processUrlVariablesRealtime(baseUrl);
    }
    
    /**
     * @description 处理POST请求URL
     * @param {string} url - 包含POST信息的URL
     * @param {Object} params - 参数对象
     * @returns {Object} POST请求配置
     */
    function handlePostUrl(url, params) {
        const [baseUrl, postData] = url.split(';post;');
        
        if (postData) {
            // 解析POST数据模板
            let processedPostData = postData;
            for (const [key, value] of Object.entries(params)) {
                processedPostData = processedPostData.replace(
                    new RegExp(`\\{${key}\\}`, 'g'), 
                    encodeURIComponent(value)
                );
            }
            
            try {
                const savedData = localStorage.getItem('global_variables');
                if (savedData) {
                    const variables = JSON.parse(savedData);
                    for (const key in variables) {
                        if (variables[key] !== undefined && variables[key] !== '') {
                            processedPostData = processedPostData.replace(
                                new RegExp(`\\{${key}\\}`, 'g'), 
                                encodeURIComponent(variables[key])
                            );
                        }
                    }
                }
            } catch (e) {
                console.warn('POST数据实时变量替换失败:', e);
            }
            
            return {
                url: baseUrl,
                method: 'POST',
                data: processedPostData,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };
        }
        
        return baseUrl;
    }

    /**
     * @description 自动获取详情页URL
     * @returns {Promise<string>} 详情页URL
     */
    async function getAnyDetailUrlForTest() {
        const baseUrl = document.getElementById('主页url')?.value;
        const cateUrlRule = document.getElementById('分类url')?.value;
        
        let listRule, linkRule;
        let listSourceUrl, sourceHtml;

        if (cateUrlRule && document.getElementById('数组')?.value) {
            listRule = document.getElementById('数组')?.value;
            linkRule = document.getElementById('链接')?.value;
            listSourceUrl = buildTestUrl(); // buildTestUrl 内部会处理分类URL和变量替换
        } else {
            listRule = document.getElementById('数组')?.value;
            linkRule = document.getElementById('链接')?.value;
            listSourceUrl = baseUrl;
            
            if (listSourceUrl) {
                for (const key in window.loadVariables) {
                    if (window.loadVariables[key]) {
                        listSourceUrl = listSourceUrl.replace(new RegExp(`{${key}}`, 'g'), window.loadVariables[key]);
                    }
                }
            }
        }

        if (!listRule || !linkRule) {
            throw new Error('详情页测试依赖于 [数组, 链接] 规则，请确保已填写。');
        }

        if (!listSourceUrl) {
            throw new Error('无法确定列表页来源 (分类URL 和 主页URL 都为空)。');
        }
        
        if (typeof listSourceUrl === 'object' && listSourceUrl.method === 'POST') {
            const formData = new FormData();
            formData.append('target_url', listSourceUrl.url);
            formData.append('method', 'POST');
            formData.append('post_data', listSourceUrl.data);
            
            const response = await fetch('/index.php/Proxy/load', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error(`HTTP错误! 状态码: ${response.status}`);
            sourceHtml = await response.text();
        } else {
            const response = await fetch(`/index.php/Proxy/load?target_url=${encodeURIComponent(listSourceUrl)}`);
            if (!response.ok) throw new Error(`HTTP错误! 状态码: ${response.status}`);
            sourceHtml = await response.text();
        }

        const listResult = runTest(sourceHtml, listRule);
        if (!listResult.success || listResult.data.length === 0) {
            const sourceDescription = cateUrlRule ? '分类页' : '主页';
            throw new Error(`"数组"规则未能从${sourceDescription}获取到任何项目。`);
        }

        const firstItemHtml = listResult.data[0];
        const linkResult = runTest(firstItemHtml, linkRule);
        if (!linkResult.success || linkResult.data.length === 0) {
            throw new Error('"链接"规则未能从列表项目中提取到URL。');
        }

        const detailUrlPart = linkResult.data[0];
        const finalBaseUrl = baseUrl || (typeof listSourceUrl === 'string' ? listSourceUrl : listSourceUrl.url);
        try {
            return new URL(detailUrlPart, finalBaseUrl).href;
        } catch (e) {
            throw new Error(`拼接详情页URL失败: ${e.message}`);
        }
    }

    /**
     * @description 解析上下文依赖
     * @param {string} fieldId - 字段ID
     * @param {string} sourceHtml - 源HTML
     * @returns {Promise<Object>} 上下文结果
     */
    async function resolveContext(fieldId, sourceHtml) {
        const fieldDef = findFieldDefinition(xbpqFieldsData, fieldId);
        if (!fieldDef?.dependsOn) {
            return { success: true, context: sourceHtml, parentRuleId: '页面源码' };
        }
    
        const parentRuleId = fieldDef.dependsOn;
        const parentFullRule = document.getElementById(parentRuleId)?.value;
    
        const grandParentContext = await resolveContext(parentRuleId, sourceHtml);
        if (!grandParentContext.success) {
            return grandParentContext;
        }
    
        if (!parentFullRule) {
            return grandParentContext;
        }
    
        const parentResult = runTest(grandParentContext.context, parentFullRule);
    
        if (!parentResult.success || parentResult.data.length === 0) {
            return { success: false, error: `父规则 "${parentRuleId}" 在其上下文中未能找到任何元素。` };
        }
    
        const parentRuleDef = findFieldDefinition(xbpqFieldsData, parentRuleId);
        const isParentArrayRule = parentRuleDef && (
            parentRuleDef.id.includes('数组') || 
            parentRuleDef.id.includes('列表') ||
            parentRuleDef.key.includes('数组') ||
            parentRuleDef.key.includes('列表')
        );

        if (isParentArrayRule) {
            return { success: true, context: grandParentContext.context, parentRuleId };
        }
    
        return { success: true, context: parentResult.data[0], parentRuleId };
    }

    /**
     * @description HTML转义
     * @param {string} text - 输入文本
     * @returns {string} 转义后的HTML
     */
    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * @description 手动运行测试
     */
    async function manualRunTest() {
        const resultContainer = document.querySelector('#testModal .test-result-container');
        const resultDiv = document.querySelector('#testModal #testResultContent');
        const urlInput = document.querySelector('#testModal #testUrl');
        const sourceHtmlInput = document.querySelector('#testModal #sourceHtmlInput');
        const selectorInput = document.querySelector('#testModal #testSelectorInput');
        
        if (!resultContainer || !resultDiv || !urlInput || !sourceHtmlInput || !selectorInput) return;

        resultContainer.style.display = 'block';
        resultDiv.innerHTML = '准备测试...';

        try {
            let testUrl = urlInput.value;
            let currentSource = sourceHtmlInput.value.trim();
            
            const isSourceHtmlVisible = sourceHtmlInput.style.display !== 'none';
            const hasSourceHtml = currentSource && currentSource !== '';

            if (isSourceHtmlVisible && hasSourceHtml) {
                resultDiv.innerHTML = '正在使用自定义源码进行测试...';
            } else {
                if (!testUrl) throw new Error('测试URL为空。');
                
                resultDiv.innerHTML = `正在从 ${testUrl} 加载源码...`;
                
                if (typeof testUrl === 'object' && testUrl.method === 'POST') {
                    const formData = new FormData();
                    formData.append('target_url', testUrl.url);
                    formData.append('method', 'POST');
                    formData.append('post_data', testUrl.data);
                    
                    const response = await fetch('/index.php/Proxy/load', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!response.ok) throw new Error(`HTTP错误! 状态码: ${response.status}`);
                    currentSource = await response.text();
                } else {
                    const proxyUrl = `/index.php/Proxy/load?target_url=${encodeURIComponent(testUrl)}`;
                    const response = await fetch(proxyUrl);
                    if (!response.ok) throw new Error(`HTTP错误! 状态码: ${response.status}`);
                    currentSource = await response.text();
                }
                
                sourceHtmlInput.value = currentSource;
            }

            const getRuleChain = (fieldId) => {
                const chain = [];
                let currentId = fieldId;
                
                while (currentId) {
                    const fieldDef = findFieldDefinition(xbpqFieldsData, currentId);
                    if (!fieldDef) break;
                    
                    const rule = document.getElementById(fieldDef.id)?.value;
                    chain.unshift({ 
                        id: fieldDef.id, 
                        key: fieldDef.key, 
                        rule: rule || '', 
                        type: fieldDef.type 
                    });
                    
                    currentId = fieldDef.dependsOn;
                }
                
                return chain;
            };

            const ruleChain = getRuleChain(currentTestFieldId);
            console.log('规则链:', ruleChain);
            
            const testResult = runTest(currentSource, ruleChain);

            const parentRuleName = ruleChain.length > 1 ? 
                ruleChain[ruleChain.length - 2].key : '页面源码';
                
            resultDiv.innerHTML = `在 [<b>${parentRuleName}</b>] 的结果上找到 <b>${testResult.data.length}</b> 个结果。`;
            if (testResult.data.length > 0) {
                resultDiv.innerHTML += `<br>第一个结果: <code>${escapeHtml(testResult.data[0].substring(0, 200))}${testResult.data[0].length > 200 ? '...' : ''}</code>`;
            }
            resultDiv.innerHTML += '<hr>';
            
            lastResultData = testResult.data;
            renderResults();

        } catch (error) {
            resultDiv.innerHTML = `<span style="color:red;">测试失败:</span> ${error.message}`;
            if (error.stack) {
                console.error("测试错误详情:", error.stack);
            }
        }
    }

    /**
     * @description 渲染测试结果
     */
    function renderResults() {
        const resultDiv = document.querySelector('#testModal #testResultContent');
        if (!resultDiv) return;
        
        const existingHeader = resultDiv.querySelector('hr');
        const headerHtml = existingHeader ? resultDiv.innerHTML.split('<hr>')[0] + '<hr>' : '';
        
        resultDiv.innerHTML = headerHtml;
        
        const contentDiv = document.createElement('div');
        
        if (isHtmlMode) {
            contentDiv.style.whiteSpace = 'normal';
            if (lastResultData.length > 0) {
                contentDiv.innerHTML = lastResultData
                    .map(item => `<div style="border:1px solid #ddd;margin:5px;padding:10px;border-radius:4px;">${item}</div>`)
                    .join('');
            } else {
                contentDiv.innerHTML = '<div style="text-align:center;color:#666;">无内容可渲染为HTML。</div>';
            }
        } else {
            contentDiv.style.whiteSpace = 'pre-wrap';
            contentDiv.style.fontFamily = 'monospace';
            contentDiv.style.fontSize = '13px';
            contentDiv.style.lineHeight = '1.4';
            
            if (lastResultData.length > 0) {
                contentDiv.textContent = lastResultData.join('\n' + '-'.repeat(50) + '\n');
            } else {
                contentDiv.textContent = '未找到任何内容。';
            }
        }
        
        resultDiv.appendChild(contentDiv);
    }

    /**
     * @description 应用选择器到字段
     */
    function applySelectorToField() {
        if (currentTestFieldId) {
            const mainInput = document.getElementById(currentTestFieldId);
            const modalInput = document.querySelector('#testModal #testSelectorInput');
            if (mainInput && modalInput) {
                mainInput.value = modalInput.value;
                showToast('规则已应用到表单！', 'success');
                const modalElement = document.getElementById('testModal');
                if (modalElement && typeof modalElement.close === 'function') {
                    modalElement.close();
                }
            } else {
                showToast('应用失败：无法找到对应的输入框。', 'error');
            }
        }
    }

    /**
     * @description 切换手风琴
     * @param {HTMLElement} button - 按钮元素
     */
    function toggleAccordion(button) {
        const formGroup = button.closest('.form-group');
        if (!formGroup) return;
        
        const content = formGroup.querySelector('.variable-accordion');
        if (!content) return;
        
        if (content.style.display === 'flex') {
            content.style.display = 'none';
            button.classList.remove('active');
        } else {
            document.querySelectorAll('.variable-accordion').forEach(acc => {
                if (acc !== content) {
                    acc.style.display = 'none';
                    const otherButton = acc.closest('.form-group')?.querySelector('.btn.secondary-btn.active');
                    if (otherButton) otherButton.classList.remove('active');
                }
            });
            
            content.style.display = 'flex';
            button.classList.add('active');
        }
    }

    /**
     * @description 查找字段定义
     * @param {Object} data - 字段数据
     * @param {string} fieldId - 字段ID
     * @returns {Object|null} 字段定义
     */
    function findFieldDefinition(data, fieldId) {
        for (const category in data) {
            const found = data[category].find(field => field.id === fieldId);
            if (found) return found;
        }
        return null;
    }

    /**
     * @description 渲染表单
     */
    function renderForm() {
        const fieldTemplate = Handlebars.compile(`
            <div class="form-group">
                <label for="{{id}}">{{key}}</label>
                <div class="input-with-buttons">
                    {{#if (eq type "textarea")}}
                        <textarea id="{{id}}" name="{{id}}" placeholder="{{placeholder}}" rows="2"></textarea>
                    {{else}}
                        <input type="text" id="{{id}}" name="{{id}}" placeholder="{{placeholder}}">
                    {{/if}}
                </div>
            </div>
        `);
        
        for (const tabName in xbpqFieldsData) {
            const container = document.getElementById(tabName);
            if (container) {
                container.innerHTML = '';
                xbpqFieldsData[tabName].forEach(field => {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = fieldTemplate(field);
                    const formGroup = tempDiv.firstElementChild;
                    const buttonContainer = formGroup.querySelector('.input-with-buttons');
                    const inputElement = formGroup.querySelector('input, textarea');
                    
                    if (field.test_btn) {
                        const testBtn = document.createElement('button');
                        testBtn.type = 'button';
                        testBtn.className = 'btn secondary-btn btn-sm';
                        testBtn.innerText = '测试';
                        testBtn.onclick = () => openTestModal(field.id);
                        buttonContainer.appendChild(testBtn);
                    }
                    
                    if (field.var_btn && field.var_btn.vars && Array.isArray(field.var_btn.vars)) {
                        const varBtn = document.createElement('button');
                        varBtn.type = 'button';
                        varBtn.className = 'btn secondary-btn btn-sm';
                        varBtn.innerText = '变量';
                        varBtn.onclick = () => toggleAccordion(varBtn);
                        buttonContainer.appendChild(varBtn);
                        
                        const accordionContainer = document.createElement('div');
                        accordionContainer.className = 'variable-accordion';
                        
                        const variableList = document.createElement('div');
                        variableList.className = 'variable-list';
                        
                        field.var_btn.vars.forEach(variable => {
                            const varChip = document.createElement('button');
                            varChip.type = 'button';
                            varChip.className = 'variable-item';
                            varChip.innerText = variable;
                            varChip.onclick = (e) => {
                                e.preventDefault();
                                inputElement.value += variable;
                                inputElement.focus();
                            };
                            variableList.appendChild(varChip);
                        });
                        
                        accordionContainer.appendChild(variableList);
                        formGroup.appendChild(accordionContainer);
                    }
                    
                    container.appendChild(formGroup);
                });
            }
        }
    }

    /**
     * @description 解析并填充表单
     * @param {string} content - JSON内容
     */
    function parseAndFill(content) {
        try {
            const rules = parseCleanJson(content);
            fillForm(rules);
            showToast('规则加载成功！', 'success');
        } catch(e) {
            showToast(`解析规则JSON失败: ${e.message}`, 'error');
        }
    }

    /**
     * @description 填充表单
     * @param {Object} rules - 规则对象
     */
    function fillForm(rules) {
        for (const key in rules) {
            const input = document.getElementById(key);
            if (input) {
                input.value = rules[key];
            }
        }
    }

    /**
     * @description 收集表单数据
     * @returns {Object} 表单数据
     */
    function collectFormData() {
        const form = document.getElementById('xbpq-rule-form');
        const formData = new FormData(form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            if (value) {
                data[key] = value;
            }
        }
        
        return data;
    }

    /**
     * @description 打开测试弹窗
     * @param {string} fieldId - 字段ID
     */
    function openTestModal(fieldId) {
        currentTestFieldId = fieldId;
        const fieldDef = findFieldDefinition(xbpqFieldsData, fieldId);
        
        new Modal({
            id: 'testModal',
            title: '测试：' + (fieldDef ? fieldDef.key : '规则'),
            content: renderTemplate('test-modal-template'),
            footer: '<button id="manualTestBtn" class="btn primary-btn">运行测试</button>',
            width: '700px',
            height: '80%'
        });

        setTimeout(async () => {
            const urlInput = document.getElementById('testUrl');
            const selectorInput = document.getElementById('testSelectorInput');
            if (!urlInput || !selectorInput) return;
            
            selectorInput.value = document.getElementById(fieldId).value;
            selectorInput.placeholder = `当前测试: ${fieldDef.key}`;
            
            const toggleBtn = document.getElementById('toggleResultModeBtn');
            if (toggleBtn) toggleBtn.innerText = '切换到HTML模式';

            // 检查是否详情或播放tab
            const tabId = document.querySelector(`[for="${fieldId}"]`)?.closest('.tab-content').id;
            if (tabId === 'detail' || tabId === 'play') {
                // 自动用"链接规则"结果生成测试URL
                try {
                    urlInput.value = '自动获取中...';
                    const detailUrl = await getAnyDetailUrlForTest();
                    urlInput.value = detailUrl;
                } catch (e) {
                    urlInput.value = '';
                    showToast('自动提取详情页URL失败: ' + e.message, 'error');
                }
            } else {
                urlInput.value = buildTestUrl();
            }
        }, 10);
    }

    // 事件监听器
    document.body.addEventListener('click', (event) => {
        if(event.target.id === 'manualTestBtn') manualRunTest();
        if(event.target.id === 'applySelectorBtn') applySelectorToField();
        
        const modal = event.target.closest('#testModal');
        if (!modal) return;

        if (event.target.id === 'toggleSourceBtn') {
            const t = modal.querySelector('#sourceHtmlInput');
            t && (t.style.display = t.style.display === 'none' ? 'block' : 'none');
        }
        if (event.target.id === 'toggleResultModeBtn') {
            if (lastResultData.length === 0) return;
            isHtmlMode = !isHtmlMode;
            event.target.innerText = isHtmlMode ? '切换到纯文本模式' : '切换到HTML模式';
            renderResults();
        }
    });

    // 保存按钮事件
    document.getElementById('saveBtn').addEventListener('click', () => {
        if (!filePathFromServer) {
            showToast('文件路径未知，无法保存。', 'error');
            return;
        }
        const jsonData = collectFormData();
        const fileContent = JSON.stringify(jsonData, null, 2);
        const formData = new FormData();
        formData.append('filePath', filePathFromServer);
        formData.append('fileContent', fileContent);
        showToast('正在保存...', 'info');
        fetch('/index.php/Edit/save', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                showToast(result.message, 'success');
            } else {
                throw new Error(result.message);
            }
        })
        .catch(err => {
            showToast(`保存失败: ${err.message}`, 'error');
        });
    });

    // 在线编辑按钮事件
    document.getElementById('onlineEditBtn').addEventListener('click', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const file = urlParams.get('file');
        window.open('/index.php/Edit?file=' + file + '&api=editor', '_blank');
    });

    // 初始化
    renderForm();
    if (fileContentFromServer && typeof fileContentFromServer === 'string' && !fileContentFromServer.startsWith('错误：')) {
        parseAndFill(fileContentFromServer);
    }
});