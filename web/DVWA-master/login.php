<?php
// Enforce uppercase URL casing
// if (strpos($_SERVER['REQUEST_URI'], 'dvwa-master') !== false) {
//     header('Location: ' . str_replace('dvwa-master', 'DVWA-master', $_SERVER['REQUEST_URI']), true, 301);
//     exit;
// }


define( 'DVWA_WEB_PAGE_TO_ROOT', '' );
require_once DVWA_WEB_PAGE_TO_ROOT . 'dvwa/includes/dvwaPage.inc.php';

dvwaPageStartup( array( ) );

dvwaDatabaseConnect();

if( isset( $_POST[ 'Login' ] ) ) {
	// --- ASDS SERVER-SIDE TELEMETRY HOOK ---
	$telemetry_data = [
		'event' => 'hit',
		'client_ip' => $_SERVER['REMOTE_ADDR'],
		'method' => 'POST',
		'path' => $_SERVER['REQUEST_URI'],
		'host' => $_SERVER['HTTP_HOST'],
		'full_url' => (isset($_SERVER['HTTPS']) ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]",
		'payload' => "username=" . ($_POST['username'] ?? '') . "&password=" . ($_POST['password'] ?? ''),
		'timestamp' => gmdate("Y-m-d\TH:i:s\Z"),
		'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
	];

	$ch = curl_init('http://localhost:8010/api/v1/telemetry');
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($telemetry_data));
	curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
<<<<<<< HEAD
	curl_setopt($ch, CURLOPT_TIMEOUT, 2);
	$response = curl_exec($ch);
	$res_data = json_decode($response, true);
	curl_close($ch);

=======
	curl_setopt($ch, CURLOPT_TIMEOUT, 3); // Slightly longer timeout for stability
	$response = curl_exec($ch);
	$curl_error = curl_error($ch);
	curl_close($ch);

	// FAIL-CLOSE POLICY: If security system is down or slow, block the request.
	if ($response === false) {
		header('HTTP/1.1 403 Forbidden');
		die("<h1>Security Alert</h1><p>The security system is currently unavailable. Access denied for safety.</p>");
	}

	$res_data = json_decode($response, true);
>>>>>>> 27a4b8385bfacb236209d169d98e31a75383214a
	if (isset($res_data['action']) && $res_data['action'] === 'block') {
		header('HTTP/1.1 403 Forbidden');
		die("<h1>403 Forbidden</h1><p>Your IP has been blocked due to suspicious activity.</p>");
	}
	// --- END ASDS HOOK ---
	// Anti-CSRF
	if (array_key_exists ("session_token", $_SESSION)) {
		$session_token = $_SESSION[ 'session_token' ];
	} else {
		$session_token = "";
	}

	// checkToken( $_REQUEST[ 'user_token' ], $session_token, 'login.php' );

	$user = $_POST[ 'username' ];
	$user = stripslashes( $user );
	$user = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $user ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));

	$pass = $_POST[ 'password' ];
	$pass = stripslashes( $pass );
	$pass = ((isset($GLOBALS["___mysqli_ston"]) && is_object($GLOBALS["___mysqli_ston"])) ? mysqli_real_escape_string($GLOBALS["___mysqli_ston"],  $pass ) : ((trigger_error("[MySQLConverterToo] Fix the mysql_escape_string() call! This code does not work.", E_USER_ERROR)) ? "" : ""));
	$pass = md5( $pass );

	$query = ("SELECT table_schema, table_name, create_time
				FROM information_schema.tables
				WHERE table_schema='{$_DVWA['db_database']}' AND table_name='users'
				LIMIT 1");
	$result = @mysqli_query($GLOBALS["___mysqli_ston"],  $query );
	if( mysqli_num_rows( $result ) != 1 ) {
		dvwaMessagePush( "First time using DVWA.<br />Need to run 'setup.php'." );
		dvwaRedirect( DVWA_WEB_PAGE_TO_ROOT . 'setup.php' );
	}

	$query  = "SELECT * FROM `users` WHERE user='$user' AND password='$pass';";
	$result = @mysqli_query($GLOBALS["___mysqli_ston"],  $query ) or die( '<pre>' . ((is_object($GLOBALS["___mysqli_ston"])) ? mysqli_error($GLOBALS["___mysqli_ston"]) : (($___mysqli_res = mysqli_connect_error()) ? $___mysqli_res : false)) . '.<br />Try <a href="setup.php">installing again</a>.</pre>' );
	if( $result && mysqli_num_rows( $result ) == 1 ) {    // Login Successful...
		// --- ASDS LOGIN SUCCESS HOOK ---
		$success_data = $telemetry_data;
		$success_data['event'] = 'login_success';
		$success_data['timestamp'] = gmdate("Y-m-d\TH:i:s\Z");
		
		$ch = curl_init('http://localhost:8010/api/v1/telemetry');
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($success_data));
		curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
		curl_setopt($ch, CURLOPT_TIMEOUT, 1);
		curl_exec($ch);
		curl_close($ch);
		// --- END HOOK ---

		dvwaMessagePush( "You have logged in as '{$user}'" );
		dvwaLogin( $user );
		dvwaRedirect( DVWA_WEB_PAGE_TO_ROOT . 'index.php' );
	}

	// Login failed
	dvwaMessagePush( 'Login failed' );
	dvwaRedirect( 'login.php' );
}

$messagesHtml = messagesPopAllToHtml();

Header( 'Cache-Control: no-cache, must-revalidate');    // HTTP/1.1
Header( 'Content-Type: text/html;charset=utf-8' );      // TODO- proper XHTML headers...
Header( 'Expires: Tue, 23 Jun 2009 12:00:00 GMT' );     // Date in the past
	$telemetry_host = explode(':', $_SERVER['HTTP_HOST'])[0];
	// Removed hardcoded localhost -> 127.0.0.1 translation to support cross-device routing
	Header( "Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://" . $telemetry_host . ":8010; connect-src 'self' http://" . $telemetry_host . ":8010; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;" );

// Anti-CSRF
// generateSessionToken();

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

	</div> <!--<div id=\"header\">-->

	<div id=\"content\">

	<form action=\"login.php\" method=\"post\">

	<fieldset>

			<label for=\"user\">Username</label> <input type=\"text\" class=\"loginInput\" size=\"20\" name=\"username\"><br />


			<label for=\"pass\">Password</label> <input type=\"password\" class=\"loginInput\" AUTOCOMPLETE=\"off\" size=\"20\" name=\"password\"><br />

			<br />

			<p class=\"submit\"><input type=\"submit\" value=\"Login\" name=\"Login\"></p>

	</fieldset>


	</form>

	<br />

	{$messagesHtml}

	<br />
	<br />
	<br />
	<br />
	<br />
	<br />
	<br />
	<br />

	</div > <!--<div id=\"content\">-->

	<div id=\"footer\">



	</div> <!--<div id=\"footer\"> -->

	</div> <!--<div id=\"wrapper\"> -->

	<script>window.__DVWA_CLIENT_IP = '" . $_SERVER['REMOTE_ADDR'] . "';</script>
	<script src=\"http://" . $telemetry_host . ":8010/static/telemetry.js\"></script>
	</body>

</html>";

?>
