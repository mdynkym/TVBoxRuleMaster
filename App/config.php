<?php
// 应用配置文件
return array(
    /**
     * URL路由模式
     * - 'NORMAL':    普通模式 index.php?c=Controller&a=Action
     * - 'PATH_INFO': 路径模式 index.php/Controller/Action
     */
    'PATH_MOD' => 'PATH_INFO',

    /**
     * 是否开启URL重写（伪静态）
     * 开启后会隐藏URL中的 index.php，需要Web服务器配置重写规则。
     * - true:  /Controller/Action
     * - false: /index.php/Controller/Action
     */
    'REWRITE' => false,

    // =======================================================
    // TVBox 应用配置
    // =======================================================

    /**
     * @var string 配置规则的默认存储位置
     * 所有通过“下载”功能保存的规则和资源，以及在线编辑的文件，都将存放在此目录下。
     * 必须以 './' 开头，以 '/' 结尾。
     */
    'DEFAULT_SAVE_PATH' => './data/box/',

    /**
     * @var string 配置模板的存储位置
     * 用于存放 api_list.json 和新建规则时使用的模板文件。
     * 必须以 './' 开头，以 '/' 结尾。
     */
    'TEMPLATE_PATH' => './data/Json/',

    /**
     * @var bool 是否开启代理缓存
     * 用于缓存通过 /Proxy/load 接口加载的远程URL内容，可提升重复加载速度。
     * 在调试规则时可设置为 false 以获取实时内容。
     */
    'ENABLE_PROXY_CACHE' => true,

    /**
     * @var string 代理缓存目录
     * 用于存放通过 /Proxy/load 接口加载的远程URL内容缓存。
     * 必须以 './' 开头，以 '/' 结尾。
     * 注意：如果开启了代理缓存，必须确保此目录可写。
     */
    'PROXY_CACHE_PATH' => './data/cache/',

    /**
     * @var string 代理缓存过期时间
     * 用于设置通过 /Proxy/load 接口加载的远程URL内容缓存过期时间，单位为秒。
     */
    'PROXY_CACHE_EXPIRE' => 3600,


    /**
     * 其他应用配置
     */
    'PASSWORD' => getenv('PASSWORD') !== false ? getenv('PASSWORD') : 'tvbox456',
    'NEED_LOGIN' => true,
    'USE_SESSION' => true,
    'PC_UA' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
);