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
export APIHUB_POSTGRESQL_DB_NAME=apihub-db-$(rnd 6 10)            # Mandatory # Logical database in PG cluster for APIHUB. Manual pre-creation required" 
export APIHUB_POSTGRESQL_USERNAME=apihub-user-$(rnd 3 7)            # Mandatory # User for APIHUB_POSTGRESQL_DB_NAME database" 
export APIHUB_POSTGRESQL_PASSWORD=$(rnd 12 20)            # Mandatory # Password for APIHUB_POSTGRESQL_USERNAME user." 

export APIHUB_ADMIN_EMAIL=x_apihub_$(rnd 13 17)            # Optional # Default admin user login (example: x_apihub). If set - this admin user will be created automatically." 
export APIHUB_ADMIN_PASSWORD=$(rnd 11 19)            # Optional # Default admin user password (example: password)" 
 
export SAML_CRT=$(rnd 1 9 | base64)            # Optional # SAML server certificate, base64 encoded. Required only if SAML integration enabled" 
export SAML_KEY=$(rnd 2 10 | base64)            # Optional # SAML server private key, base64 encoded. Required only if SAML integration enabled" 
export JWT_PRIVATE_KEY=$(cat jwt_private_key)            # Mandatory # Self generated private PKCS" 
export LDAP_USER=$(rnd 3 11)            # Optional # LDAP User used for connecting to LDAP server" 
export LDAP_USER_PASSWORD=$(rnd 4 12)            # Optional # Password for LDAP User" 
export STORAGE_SERVER_USERNAME=$(rnd 5 13)            # Optional # Access Key ID from Minio S3 storage" 
export STORAGE_SERVER_BUCKET_NAME=$(rnd 6 14)            # Optional # Bucket name in Minio S3 storage" 
export STORAGE_SERVER_CRT=$(rnd 7 15)            # Optional # Certificate for accessing Minio S3 storage" 
export STORAGE_SERVER_URL=$(rnd 8 16)            # Optional # Minio endpoint for client connection" 
export STORAGE_SERVER_PASSWORD=$(rnd 9 17)            # Optional # Secret key for Minio S3 storage access" 
export APIHUB_ACCESS_TOKEN=$(rnd 2 35)            # Mandatory # Default system access token (any string). The token will be provisioned automatically during bootstrap " 
} 


generate-local-passwords 
envsubst <local-secrets.template >./local-secrets.yaml 


