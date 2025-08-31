<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" href="assets/img/ico.png">

    <title>登录 - TVBox Rule Master</title>
    <style>
        * {
            box-sizing: border-box;
        }
        html {
            height: 100%;
        }
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #f8f9fa;
        }
        .login-container {
            width: 100%;
            max-width: 400px;
            padding: 40px;
            margin: 20px;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 4px 25px rgba(0, 0, 0, .05);
            text-align: center;
        }
        h1 {
            margin-top: 0;
            margin-bottom: 25px;
            font-weight: 600;
            font-size: 24px;
            color: #343a40;
        }
        form {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        input[type="password"] {
            padding: 12px 15px;
            font-size: 16px;
            border-radius: 6px;
            border: 1px solid #ced4da;
            transition: border-color .15s ease-in-out, box-shadow .15s ease-in-out;
        }
        input[type="password"]:focus {
            border-color: #80bdff;
            outline: 0;
            box-shadow: 0 0 0 .2rem rgba(0, 123, 255, .25);
        }
        button {
            padding: 12px 20px;
            font-size: 16px;
            font-weight: 500;
            border-radius: 6px;
            border: none;
            background-color: #007bff;
            color: white;
            cursor: pointer;
            transition: background-color .2s ease-in-out, transform .1s ease;
        }
        button:hover {
            background-color: #0069d9;
        }
        button:active {
            transform: scale(.98);
        }
        .error-message {
            color: #dc3545;
            margin-top: 15px;
            margin-bottom: 0;
            text-align: left;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h1>登录</h1>
        <form method="POST" action="/<?php echo WWW_URL('Login', 'doLogin'); ?>">
            <input type="password" name="password" placeholder="请输入密码" required autofocus>
            <button type="submit">进 入</button>
        </form>
        <?php if (!empty($error)): ?>
            <p class="error-message"><?php echo htmlspecialchars($error); ?></p>
        <?php endif; ?>
    </div>
</body>
</html>