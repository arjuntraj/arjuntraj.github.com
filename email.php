<?php

	$mail = $_POST['email'];
	$name = $_POST['fname'];
	$subject = $_POST['subject'];
	$phone = $_POST['phone'];
	$text = $_POST['message'];
	$ip = $_SERVER['REMOTE_ADDR'];

	$date = date('F j, Y, g:i a');	

$to = "arjun441@gmail.com";




$message = '<table width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" align="center" style="border:10px solid #c8e5f6"  >
					<tbody>
					<tr>
						<td valign="top" align="left">
						<table width="650" cellspacing="0" cellpadding="0" border="0" style="border-bottom:1px solid #cccccc">
						<tbody>
							<tr>
							<td width="245" valign="middle" align="left" style="padding:15px"><img width="128" height="128" alt="Arjun T Raj" src="http://i.stack.imgur.com/UYi86.jpg"></td>
							<td width="285" valign="middle" align="right" style="font-family:Arial;font-size:14px;color:#555555;padding:30px">
							<strong>Contact Info</strong>
							<br>
							<br>
							'.$date.'</td>
							</tr>
						</tbody>
						</table>						
						</td>
					</tr>
					<tr>
						<td valign="top" align="left">
							<table width="650" cellpadding="0" border="0" style="padding:30px 30px 30px 30px">
							<tbody>							
							<tr>
							<td style="font-family:Arial;font-size:14px;padding-bottom:15px">
								<b>New Contact Information recieved</b>						
							</td>
							</tr>
							<p>Name:	<b>'.$name.'</b> </p>	
							<p>Email:	<b>'.$mail.'</b> </p>
							<p>Phone:	<b>'.$phone.'</b> </p>
							<p>Subject:	<b>'.$subject.'</b> </p>
							<p>Message:	<b>'.$text.'</b> </p>														
							</tbody>
							</table>
						</td>
						</tr>	
															 
					</table>';		

$headers = "MIME-Version: 1.0\r\n"
			."Content-Type: text/html; charset=iso-8859-1\r\n"
			."Content-Transfer-Encoding: 8bit\r\n"
			."From: =?UTF-8?B?". base64_encode($name." - From arjuntraj.in") ."?= <".$mail.">\r\n"
			."X-Mailer: PHP/". phpversion();


 if(mail($to, $subject,$message, $headers)){
	echo "<p>Message sent! Thanks!</p>";
}

else{ 
	echo "<p>Error</p>";
}
?>