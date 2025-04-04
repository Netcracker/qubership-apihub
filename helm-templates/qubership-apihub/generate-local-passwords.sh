#!/bin/bash 
 
function rnd()
{
if [ $# -eq 2 ] 
then
   A=$1 ; B=$2
else  
   A=3  ; B=35
fi
echo $(expr $(date +%N) + $(date +%s) \* $(date +%N%s) ) | base64 | cut -c $A-$B
} 
  

function generate-local-passwords ()
{ 
export APIHUB_ADMIN_EMAIL=x_apihub_$(rnd 13 17)            # Optional # Default admin user login (example: x_apihub). If set - this admin user will be created automatically." 
export APIHUB_ADMIN_PASSWORD=$(rnd 11 19)            # Optional # Default admin user password (example: password)" 
export JWT_PRIVATE_KEY=$(cat jwt_private_key)            # Mandatory # Self generated private PKCS" 
}

generate-local-passwords 
envsubst <local-secrets.template >./local-secrets.yaml 


