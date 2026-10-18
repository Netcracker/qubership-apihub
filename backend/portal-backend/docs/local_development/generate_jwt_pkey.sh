if [ -f jwt_private_key ]
then
	echo "Private key 'jwt_private_key' is already exists, please backup or remove it"
	ls -l jwt_private_key
else
	openssl genpkey -out rsakey.pem -algorithm RSA -pkeyopt rsa_keygen_bits:2048
	if [ -r rsakey.pem ]
	then
		base64 rsakey.pem | tr -d '\n' > jwt_private_key
	else
		echo "File is not readable: rsakey.pem"
		ls -l rsakey.pem
	fi
	rm -f rsakey.pem
fi
