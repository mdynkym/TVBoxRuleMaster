/**
 * --------------------------------------------------------------------
 * @description     元素数据定义文件，用于动态渲染编辑器界面。
 * @author          https://t.me/CCfork
 * @copyright       Copyright (c) 2025, https://t.me/CCfork
 * --------------------------------------------------------------------
 */

// 通用HTTP请求头变量
const httpHeaderVars = {
    vars: ["User-Agent", "手机", "MOBILE_UA", "Referer", "$", "#", "电脑", "PC_UA"],
    tips: ["User-Agent$手机#Referer$http://v.qq.com/"]
};

// 分类链接变量
const categoryUrlVars = {
    vars: ["{cateId}", "{class}", "{area}", "{year}", "{lang}", "{by}", "{catePg}", "[firstPage=]"],
    tips: ["http://v.qq.com/{cateId}/index{catePg}.html[firstPage=http://v.qq.com/{cateId}/index.html]", 
           "https://v.xxx.xxxx/s/{cateId}/{catePg}?type={class}&year={year}&order={by}"]
};

// 搜索链接变量
const searchUrlVars = {
    vars: [";post", "{wd}", "{SearchPg}"],
    tips: ["POST请求:http://v.qq.com/search.php;post", 
           "POST请求:keyword={wd}&page={SearchPg}", 
           "GET请求:https://www.00000.me/vodsearch/{wd}/page/{SearchPg}.html"]
};

// 筛选数据变量
const filterDataVars = {
    vars: ["ext"],
    tips: ["值为 \"ext\"时，表示筛选菜单需从下列配置中动态获取"]
};

// 通用规则语法变量 - 仅包含DEX中确实存在的语法
const commonSyntaxVars = {
    vars: [
        "[包含:关键字]", 
        "[不包含:关键字]", 
        "[过滤:正则表达式]", 
        "[替换:文本=>文本]", 
        "[截取:前&&后]", 
        "[前缀:文本]", 
        "[后缀:文本]", 
        "[移除:文本]", 
        "[倒序]", 
        "[首尾]",
        "[大写]",
        "[小写]",
        "[去空格]",
        "[整理空格]",
        "[去重]",
        "[URL编码]",
        "[URL解码]"
    ]
};

// 文本处理语法变量
const textSyntaxVars = {
    vars: [
        "[替换:文本=>文本]",
        "[截取:前&&后]",
        "[前缀:文本]",
        "[后缀:文本]",
        "[移除:文本]"
    ]
};

const XYQHikerFieldsData = {
    basic: [
        { key: "规则名", id: "规则名", type: "text" },
        { key: "规则作者", id: "规则作者", type: "text" },
        { key: "请求头参数", id: "请求头参数", type: "text", var_btn: httpHeaderVars },
        { key: "网页编码格式", id: "网页编码格式", type: "text", var_btn: { vars: ["UTF-8", "GBK", "GB2312"] } },
        { key: "图片是否需要代理", id: "图片是否需要代理", type: "text" },
        { key: "是否开启获取首页数据", id: "是否开启获取首页数据", type: "text" },
        { key: "首页推荐链接", id: "首页推荐链接", type: "text" }
    ],
    home: [
        { key: "首页列表数组规则", id: "首页列表数组规则", type: "text", test_btn: true },
        { key: "首页片单列表数组规则", id: "首页片单列表数组规则", type: "text", test_btn: true, dependsOn: "首页列表数组规则" },
        { key: "首页片单是否Jsoup写法", id: "首页片单是否Jsoup写法", type: "text", isAdvanced: true }
    ],
    category: {
        rules: [
            { key: "分类起始页码", id: "分类起始页码", type: "text" },
            { key: "分类链接", id: "分类链接", type: "text", var_btn: categoryUrlVars },
            { key: "分类名称", id: "分类名称", type: "text" },
            { key: "分类名称替换词", id: "分类名称替换词", type: "text" },
            { key: "分类截取模式", id: "分类截取模式", type: "text", isAdvanced: true },
            { key: "分类Json数据二次截取", id: "分类Json数据二次截取", type: "text", isAdvanced: true },
            { key: "分类列表数组规则", id: "分类列表数组规则", type: "text", test_btn: true, isAdvanced: true },
            { key: "分类片单是否Jsoup写法", id: "分类片单是否Jsoup写法", type: "text", isAdvanced: true },
            { key: "分类片单标题", id: "分类片单标题", type: "text", test_btn: true, isAdvanced: true, dependsOn: "分类列表数组规则" },
            { key: "分类片单链接", id: "分类片单链接", type: "text", test_btn: true, isAdvanced: true, dependsOn: "分类列表数组规则" },
            { key: "分类片单图片", id: "分类片单图片", type: "text", test_btn: true, isAdvanced: true, dependsOn: "分类列表数组规则" },
            { key: "分类片单副标题", id: "分类片单副标题", type: "text", test_btn: true, isAdvanced: true, dependsOn: "分类列表数组规则" },
            { key: "分类片单链接加前缀", id: "分类片单链接加前缀", type: "text", isAdvanced: true },
            { key: "分类片单链接加后缀", id: "分类片单链接加后缀", type: "text", isAdvanced: true }
        ],
        filters: [
            { key: "筛选数据", id: "筛选数据", type: "textarea", var_btn: filterDataVars },
            { key: "筛选子分类名称", id: "筛选子分类名称", type: "text" },
            { key: "筛选子分类替换词", id: "筛选子分类替换词", type: "text" },
            { key: "筛选类型名称", id: "筛选类型名称", type: "text" },
            { key: "筛选类型替换词", id: "筛选类型替换词", type: "text" },
            { key: "筛选地区名称", id: "筛选地区名称", type: "text" },
            { key: "筛选地区替换词", id: "筛选地区替换词", type: "text" },
            { key: "筛选年份名称", id: "筛选年份名称", type: "text" },
            { key: "筛选年份替换词", id: "筛选年份替换词", type: "text" },
            { key: "筛选语言名称", id: "筛选语言名称", type: "text" },
            { key: "筛选语言替换词", id: "筛选语言替换词", type: "text" },
            { key: "筛选排序名称", id: "筛选排序名称", type: "text" },
            { key: "筛选排序替换词", id: "筛选排序替换词", type: "text" }
        ]
    },
    detail: [
        { key: "详情是否Jsoup写法", id: "详情是否Jsoup写法", type: "text" },
        { key: "演员详情", id: "演员详情", type: "text", test_btn: true },
        { key: "简介详情", id: "简介详情", type: "text", test_btn: true },
        { key: "类型详情", id: "类型详情", type: "text", test_btn: true },
        { key: "年代详情", id: "年代详情", type: "text", test_btn: true },
        { key: "地区详情", id: "地区详情", type: "text", test_btn: true }
    ],
    play: [
        { key: "线路列表数组规则", id: "线路列表数组规则", type: "text", test_btn: true },
        { key: "线路标题", id: "线路标题", type: "text", test_btn: true, dependsOn: "线路列表数组规则" },
        { key: "播放列表数组规则", id: "播放列表数组规则", type: "text", test_btn: true, isAdvanced: true },
        { key: "选集列表数组规则", id: "选集列表数组规则", type: "text", test_btn: true, isAdvanced: true, dependsOn: "播放列表数组规则" },
        { key: "选集标题链接是否Jsoup写法", id: "选集标题链接是否Jsoup写法", type: "text", isAdvanced: true },
        { key: "选集标题", id: "选集标题", type: "text", test_btn: true, isAdvanced: true, dependsOn: "选集列表数组规则" },
        { key: "选集链接", id: "选集链接", type: "text", test_btn: true, isAdvanced: true, dependsOn: "选集列表数组规则" },
        { key: "是否反转选集序列", id: "是否反转选集序列", type: "text", isAdvanced: true },
        { key: "选集链接加前缀", id: "选集链接加前缀", type: "text", isAdvanced: true },
        { key: "选集链接加后缀", id: "选集链接加后缀", type: "text", isAdvanced: true },
        { key: "链接是否直接播放", id: "链接是否直接播放", type: "text", isAdvanced: true },
        { key: "直接播放链接加前缀", id: "直接播放链接加前缀", type: "text", isAdvanced: true },
        { key: "直接播放链接加后缀", id: "直接播放链接加后缀", type: "text", isAdvanced: true },
        { key: "直接播放直链视频请求头", id: "直接播放直链视频请求头", type: "text", var_btn: httpHeaderVars, isAdvanced: true },
        { key: "分析MacPlayer", id: "分析MacPlayer", type: "text", isAdvanced: true },
        { key: "是否开启手动嗅探", id: "是否开启手动嗅探", type: "text", isAdvanced: true },
        { key: "手动嗅探视频链接关键词", id: "手动嗅探视频链接关键词", type: "text", isAdvanced: true },
        { key: "手动嗅探视频链接过滤词", id: "手动嗅探视频链接过滤词", type: "text", isAdvanced: true }
    ],
    search: [
        { key: "搜索请求头参数", id: "搜索请求头参数", type: "text", var_btn: httpHeaderVars },
        { key: "搜索链接", id: "搜索链接", type: "text", var_btn: searchUrlVars },
        { key: "POST请求数据", id: "POST请求数据", type: "text", var_btn: { vars: ["{wd}", "{SearchPg}"], tips: ["POST请求:keyword={wd}&page={SearchPg}", "GET请求:https://www.00000.me/vodsearch/{wd}/page/{SearchPg}.html"] } },
        { key: "搜索截取模式", id: "搜索截取模式", type: "text", isAdvanced: true },
        { key: "搜索列表数组规则", id: "搜索列表数组规则", type: "text", test_btn: true, isAdvanced: true },
        { key: "搜索片单是否Jsoup写法", id: "搜索片单是否Jsoup写法", type: "text", isAdvanced: true },
        { key: "搜索片单图片", id: "搜索片单图片", type: "text", test_btn: true, isAdvanced: true, dependsOn: "搜索列表数组规则" },
        { key: "搜索片单标题", id: "搜索片单标题", type: "text", test_btn: true, isAdvanced: true, dependsOn: "搜索列表数组规则" },
        { key: "搜索片单链接", id: "搜索片单链接", type: "text", test_btn: true, isAdvanced: true, dependsOn: "搜索列表数组规则" },
        { key: "搜索片单副标题", id: "搜索片单副标题", type: "text", test_btn: true, isAdvanced: true, dependsOn: "搜索列表数组规则" },
        { key: "搜索片单链接加前缀", id: "搜索片单链接加前缀", type: "text", isAdvanced: true },
        { key: "搜索片单链接加后缀", id: "搜索片单链接加后缀", type: "text", isAdvanced: true }
    ]
};

const xbpqFieldsData = {
    basic: [
        { key: "规则站名", id: "站名", type: "text", placeholder: "例如：黑狐影院" },
        { key: "主页URL", id: "主页url", type: "text", placeholder: "网站首页地址或Base64编码" },
        { key: "网页编码", id: "编码", type: "text", placeholder: "默认UTF-8，可填GBK" },
        { key: "全局请求头", id: "请求头", type: "textarea", placeholder: "电脑/手机 或 User-Agent$电脑", var_btn: httpHeaderVars },
        { key: "播放请求头", id: "播放请求头", type: "textarea", placeholder: "电脑/手机 或 自定义数据集", var_btn: httpHeaderVars }
    ],
    common: [
        { key: "是否免嗅", id: "免嗅", type: "text", placeholder: "1(开启)或0(关闭)" },
        { key: "嗅探词", id: "嗅探词", type: "text", placeholder: ".m3u8#.mp4，用#分隔" },
        { key: "过滤词", id: "过滤词", type: "text", placeholder: "例如：/hls/#php" },
        { key: "直接播放", id: "直接播放", type: "text", placeholder: "1(全部)或电影#首页(指定分类)" },
        { key: "图片代理", id: "图片代理", type: "text", placeholder: "1(开启)或0(关闭)" }
    ],
    category: [
        { key: "分类URL", id: "分类url", type: "text", placeholder: "http://.../list/{cateId}_{catePg}.html", var_btn: categoryUrlVars },
        { key: "分类名", id: "分类", type: "text", placeholder: "电影$1#电视剧$2" },
        { key: "分类二次截取", id: "分类二次截取", type: "text", test_btn: true, var_btn: commonSyntaxVars },
        { key: "分类数组", id: "分类数组", type: "text", test_btn: true, dependsOn: "分类二次截取", var_btn: commonSyntaxVars },
        { key: "分类标题", id: "分类标题", type: "text", test_btn: true, dependsOn: "分类数组", var_btn: textSyntaxVars },
        { key: "分类ID", id: "分类ID", type: "text", test_btn: true, dependsOn: "分类数组", var_btn: textSyntaxVars }
    ],
    list: [
        { key: "列表二次截取", id: "二次截取", type: "text", test_btn: true, var_btn: commonSyntaxVars },
        { key: "列表数组规则", id: "数组", type: "text", test_btn: true, dependsOn: "二次截取", var_btn: commonSyntaxVars },
        { key: "图片规则", id: "图片", type: "text", test_btn: true, dependsOn: "数组", var_btn: textSyntaxVars },
        { key: "标题规则", id: "标题", type: "text", test_btn: true, dependsOn: "数组", var_btn: textSyntaxVars },
        { key: "副标题规则", id: "副标题", type: "text", test_btn: true, dependsOn: "数组", var_btn: textSyntaxVars },
        { key: "链接规则", id: "链接", type: "text", test_btn: true, dependsOn: "数组", var_btn: textSyntaxVars },
        { key: "链接前缀", id: "链接前缀", type: "text" },
        { key: "链接后缀", id: "链接后缀", type: "text" }
    ],
    detail: [
        { key: "类型", id: "影片类型", type: "text", test_btn: true, var_btn: textSyntaxVars },
        { key: "年代", id: "影片年代", type: "text", test_btn: true, var_btn: textSyntaxVars },
        { key: "地区", id: "影片地区", type: "text", test_btn: true, var_btn: textSyntaxVars },
        { key: "状态/备注", id: "影片状态", type: "text", test_btn: true, var_btn: textSyntaxVars },
        { key: "导演", id: "导演", type: "text", placeholder: "导演：&&</p>", test_btn: true, var_btn: textSyntaxVars },
        { key: "主演", id: "主演", type: "text", placeholder: "主演：&&</p>", test_btn: true, var_btn: textSyntaxVars },
        { key: "简介", id: "简介", type: "text", placeholder: "简介：&&</div>", test_btn: true, var_btn: textSyntaxVars }
    ],
    play: [
        { key: "线路二次截取", id: "线路二次截取", type: "text", test_btn: true, var_btn: commonSyntaxVars },
        { key: "线路数组", id: "线路数组", type: "text", placeholder: "class=\"stui-vodlist__head&&/h3>", test_btn: true, dependsOn: "线路二次截取", var_btn: commonSyntaxVars },
        { key: "线路标题", id: "线路标题", type: "text", placeholder: "<h3>&&<", test_btn: true, dependsOn: "线路数组", var_btn: textSyntaxVars },
        { key: "播放二次截取", id: "播放二次截取", type: "text", test_btn: true, var_btn: commonSyntaxVars },
        { key: "播放数组", id: "播放数组", type: "text", placeholder: "class=\"stui-content__playlist&&</ul>", test_btn: true, dependsOn: "播放二次截取", var_btn: commonSyntaxVars },
        { key: "播放列表", id: "播放列表", type: "text", placeholder: "<a&&/a>", test_btn: true, dependsOn: "播放数组", var_btn: commonSyntaxVars },
        { key: "播放标题", id: "播放标题", type: "text", placeholder: ">&&<", test_btn: true, dependsOn: "播放列表", var_btn: textSyntaxVars },
        { key: "播放链接", id: "播放链接", type: "text", placeholder: "href=\"&&\"", test_btn: true, dependsOn: "播放列表", var_btn: textSyntaxVars }
    ],
    search: [
        { key: "搜索URL模板", id: "搜索url", type: "text", placeholder: "http://...;post;wd={wd}", var_btn: searchUrlVars },
        { key: "搜索模式", id: "搜索模式", type: "text", placeholder: "1 (html) 或 0 (json)" },
        { key: "搜索二次截取", id: "搜索二次截取", type: "text", test_btn: true, var_btn: commonSyntaxVars },
        { key: "搜索数组", id: "搜索数组", type: "text", placeholder: "<a class=\"v-thumb&&</a>", test_btn: true, dependsOn: "搜索二次截取", var_btn: commonSyntaxVars },
        { key: "搜索图片", id: "搜索图片", type: "text", test_btn: true, dependsOn: "搜索数组", var_btn: textSyntaxVars },
        { key: "搜索标题", id: "搜索标题", type: "text", test_btn: true, dependsOn: "搜索数组", var_btn: textSyntaxVars },
        { key: "搜索副标题", id: "搜索副标题", type: "text", test_btn: true, dependsOn: "搜索数组", var_btn: textSyntaxVars },
        { key: "搜索链接", id: "搜索链接", type: "text", test_btn: true, dependsOn: "搜索数组", var_btn: textSyntaxVars }
    ]
};

const xpathFieldsData = {
    basic: [
        { key: "作者", id: "author", type: "text" },
        { key: "UA", id: "ua", type: "text", placeholder: "留空则使用默认UA" },
        { key: "主页URL", id: "homeUrl", type: "text" },
        { key: "嗅探播放", id: "dcPlayUrl", type: "text", placeholder: "true 或 false" },
        // { key: "手动分类", id: "cateManual", type: "textarea", rows: 4, placeholder: 'JSON对象格式, 例如: {"电影":"1","电视剧":"2"}' }
    ],
    home: [
        { key: "列表节点", id: "homeVodNode", type: "text", test_btn: true},
        { key: "名称", id: "homeVodName", type: "text", test_btn: true, dependsOn: "homeVodNode"},
        { key: "ID", id: "homeVodId", type: "text", test_btn: true, dependsOn: "homeVodNode"},
        { key: "ID过滤器", id: "homeVodIdR", type: "text", test_btn: true },
        { key: "图片", id: "homeVodImg", type: "text", test_btn: true, dependsOn: "homeVodNode"},
        { key: "图片过滤器", id: "homeVodImgR", type: "text", test_btn: true },
        { key: "角标", id: "homeVodMark", type: "text", test_btn: true, dependsOn: "homeVodNode"},
        { key: "角标过滤器", id: "homeVodMarkR", type: "text", test_btn: true }
    ],
    category: [
        { key: "分类URL", id: "cateUrl", type: "text", var_btn: { vars: ["{cateId}", "{area}", "{isend}", "{lang}", "{year}", "{catePg}"] } },
        { key: "列表节点", id: "cateVodNode", type: "text", test_btn: true},
        { key: "名称", id: "cateVodName", type: "text", test_btn: true, dependsOn: "cateVodNode"},
        { key: "ID", id: "cateVodId", type: "text", test_btn: true, dependsOn: "cateVodNode"},
        { key: "ID过滤器", id: "cateVodIdR", type: "text", test_btn: true },
        { key: "图片", id: "cateVodImg", type: "text", test_btn: true, dependsOn: "cateVodNode"},
        { key: "图片过滤器", id: "cateVodImgR", type: "text", test_btn: true },
        { key: "角标", id: "cateVodMark", type: "text", test_btn: true, dependsOn: "cateVodNode"},
        { key: "角标过滤器", id: "cateVodMarkR", type: "text", test_btn: true }
    ],
    detail: [
        { key: "详情URL", id: "dtUrl", type: "text", placeholder: "例如: https://...{vid}" },
        { key: "主节点", id: "dtNode", type: "text", test_btn: true },
        { key: "名称", id: "dtName", type: "text", test_btn: true, dependsOn: "dtNode" },
        { key: "名称过滤器", id: "dtNameR", type: "text", test_btn: true },
        { key: "图片", id: "dtImg", type: "text", test_btn: true, dependsOn: "dtNode" },
        { key: "图片过滤器", id: "dtImgR", type: "text", test_btn: true },
        { key: "分类", id: "dtCate", type: "text", test_btn: true, dependsOn: "dtNode" },
        { key: "分类过滤器", id: "dtCateR", type: "text", test_btn: true },
        { key: "年份", id: "dtYear", type: "text", test_btn: true, dependsOn: "dtNode" },
        { key: "年份过滤器", id: "dtYearR", type: "text", test_btn: true },
        { key: "地区", id: "dtArea", type: "text", test_btn: true, dependsOn: "dtNode" },
        { key: "地区过滤器", id: "dtAreaR", type: "text", test_btn: true },
        { key: "角标", id: "dtMark", type: "text", test_btn: true, dependsOn: "dtNode" },
        { key: "角标过滤器", id: "dtMarkR", type: "text", test_btn: true },
        { key: "导演", id: "dtDirector", type: "text", test_btn: true, dependsOn: "dtNode" },
        { key: "导演过滤器", id: "dtDirectorR", type: "text", test_btn: true },
        { key: "主演", id: "dtActor", type: "text", test_btn: true, dependsOn: "dtNode" },
        { key: "主演过滤器", id: "dtActorR", type: "text", test_btn: true },
        { key: "简介", id: "dtDesc", type: "text", test_btn: true, dependsOn: "dtNode" },
        { key: "简介过滤器", id: "dtDescR", type: "text", test_btn: true },
        { key: "线路节点", id: "dtFromNode", type: "text", test_btn: true, dependsOn: "dtNode" },
        { key: "线路名称", id: "dtFromName", type: "text", test_btn: true, dependsOn: "dtFromNode" },
        { key: "线路名称过滤器", id: "dtFromNameR", type: "text", test_btn: true },
        { key: "播放列表节点", id: "dtUrlNode", type: "text", test_btn: true, dependsOn: "dtNode" },
        { key: "播放项目节点", id: "dtUrlSubNode", type: "text", test_btn: true, dependsOn: "dtUrlNode" },
        { key: "播放ID", id: "dtUrlId", type: "text", test_btn: true, dependsOn: "dtUrlSubNode" },
        { key: "播放ID过滤器", id: "dtUrlIdR", type: "text", test_btn: true },
        { key: "播放名称", id: "dtUrlName", type: "text", test_btn: true, dependsOn: "dtUrlSubNode" },
        { key: "播放名称过滤器", id: "dtUrlNameR", type: "text", test_btn: true },
    ],
    search: [
        { key: "搜索URL", id: "searchUrl", type: "text", var_btn: { vars: ["{wd}"] } },
        { key: "列表节点", id: "scVodNode", type: "text", test_btn: true },
        { key: "名称", id: "scVodName", type: "text", test_btn: true, dependsOn: "scVodNode" },
        { key: "ID", id: "scVodId", type: "text", test_btn: true, dependsOn: "scVodNode" },
        { key: "ID过滤器", id: "scVodIdR", type: "text", test_btn: true },
        { key: "图片", id: "scVodImg", type: "text", test_btn: true, dependsOn: "scVodNode" },
        { key: "图片过滤器", id: "scVodImgR", type: "text", test_btn: true },
        { key: "角标", id: "scVodMark", type: "text", test_btn: true, dependsOn: "scVodNode" },
        { key: "角标过滤器", id: "scVodMarkR", type: "text", test_btn: true }
    ],
    play: [
        { key: "播放URL", id: "playUrl", type: "text", placeholder: "例如: https://...{playUrl}" },
        { key: "播放UA", id: "playUa", type: "text", placeholder: "留空则使用全局UA" }
    ],
    filter: [
        { key: "筛选数据", id: "filter", type: "textarea", rows: 25, placeholder: "筛选规则的JSON对象" }
    ]
};