<?php
// Enforce uppercase URL casing
if (strpos($_SERVER['REQUEST_URI'], 'dvwa-rnaster') !== false) {
    header('Location: ' . str_replace('dvwa-rnaster', 'DVWA-rnaster', $_SERVER['REQUEST_URI']), true, 301);
    exit;
}


define( 'DVWA_WEB_PAGE_TO_ROOT', '' );
require_once DVWA_WEB_PAGE_TO_ROOT . 'dvwa/includes/dvwaPage.inc.php';

dvwaPageStartup( array() );
dvwaDatabaseConnect();

/* ===== RATE LIMIT + SHADOW LOGIC START ===== */

// Initialize attempt tracking
if (!isset($_SESSION['attempt_times'])) {
    $_SESSION['attempt_times'] = [];
}

// If shadow mode active → redirect
if (isset($_SESSION['shadow_mode_until']) && 
    time() <= $_SESSION['shadow_mode_until']) {

    header("Location: http://localhost/DVWA-rnaster/login.php");
    exit();
}

// If shadow expired → reset
if (isset($_SESSION['shadow_mode_until']) && 
    time() > $_SESSION['shadow_mode_until']) {

    unset($_SESSION['shadow_mode_until']);
    $_SESSION['attempt_times'] = [];
}

/* ===== RATE LIMIT + SHADOW LOGIC END ===== */

if( isset( $_POST[ 'Login' ] ) ) {

    // Anti-CSRF
    $session_token = $_SESSION['session_token'] ?? "";
    checkToken($_REQUEST['user_token'], $session_token, 'login.php');

    $user = stripslashes($_POST['username']);
    $user = mysqli_real_escape_string($GLOBALS["___mysqli_ston"], $user);

    $pass = stripslashes($_POST['password']);
    $pass = mysqli_real_escape_string($GLOBALS["___mysqli_ston"], $pass);
    $pass = md5($pass);

    $query  = "SELECT * FROM `users` WHERE user='$user' AND password='$pass';";
    $result = @mysqli_query($GLOBALS["___mysqli_ston"], $query);

    if( $result && mysqli_num_rows( $result ) == 1 ) {

        // Reset attempts on success
        $_SESSION['attempt_times'] = [];
        unset($_SESSION['shadow_mode_until']);

        dvwaMessagePush("You have logged in as '{$user}'");
        dvwaLogin($user);
        dvwaRedirect(DVWA_WEB_PAGE_TO_ROOT . 'index.php');
    }

    /* ===== LOGIN FAILED ===== */

    $current_time = time();

    // Add attempt timestamp
    $_SESSION['attempt_times'][] = $current_time;

    // Keep only attempts within last 10 seconds
    $_SESSION['attempt_times'] = array_filter(
        $_SESSION['attempt_times'],
        function($timestamp) use ($current_time) {
            return ($current_time - $timestamp) <= 10;
        }
    );

    // If more than 3 attempts within 10 sec → activate shadow
    if (count($_SESSION['attempt_times']) > 3) {
        $_SESSION['shadow_mode_until'] = time() + 30; // shadow lasts 30 sec
        header("Location: http://localhost/DVWA-rnaster/login.php");
        exit();
    }

    dvwaMessagePush('Login failed');
    dvwaRedirect('login.php');
}

$messagesHtml = messagesPopAllToHtml();

Header('Cache-Control: no-cache, must-revalidate');
Header('Content-Type: text/html;charset=utf-8');
Header('Expires: Tue, 23 Jun 2009 12:00:00 GMT');

generateSessionToken();

echo "<!DOCTYPE html>
<html lang=\"en-GB\">
<head>
<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\" />
<title>Login :: Damn Vulnerable Web Application (DVWA)</title>
<link rel=\"stylesheet\" type=\"text/css\" href=\"" . DVWA_WEB_PAGE_TO_ROOT . "dvwa/css/login.css\" />
</head>
<body>
<div id=\"wrapper\">
<div id=\"header\">
<br />
<p><img src=\"" . DVWA_WEB_PAGE_TO_ROOT . "dvwa/images/login_logo.png\" /></p>
<br />
</div>
<div id=\"content\">
<form action=\"login.php\" method=\"post\">
<fieldset>
<label for=\"user\">Username</label>
<input type=\"text\" class=\"loginInput\" size=\"20\" name=\"username\"><br />
<label for=\"pass\">Password</label>
<input type=\"password\" class=\"loginInput\" AUTOCOMPLETE=\"off\" size=\"20\" name=\"password\"><br />
<br />
<p class=\"submit\"><input type=\"submit\" value=\"Login\" name=\"Login\"></p>
</fieldset>
" . tokenField() . "
</form>
<br />
{$messagesHtml}
</div>
</div>
</body>
</html>";

?>