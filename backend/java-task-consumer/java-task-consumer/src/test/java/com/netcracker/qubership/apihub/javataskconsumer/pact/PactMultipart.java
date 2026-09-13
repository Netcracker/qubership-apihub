package com.netcracker.qubership.apihub.javataskconsumer.pact;

import org.apache.hc.client5.http.entity.mime.MultipartEntityBuilder;
import org.apache.hc.core5.http.ContentType;

/**
 * Example multipart bodies recorded in the pact. Layout is RFC 7578 so provider verification
 * replays a parseable request. Consumer tests match the live client by included part names
 * (JTC generates a fresh boundary per request).
 */
final class PactMultipart {

    static final String BOUNDARY = "----JavaTaskConsumerPactExample";

    private PactMultipart() {
    }

    static String contentType() {
        return "multipart/form-data; boundary=" + BOUNDARY;
    }

    static MultipartEntityBuilder running() {
        return base().addTextBody("status", "running").addTextBody("builderId", LibrariesBackendPact.BUILDER_ID);
    }

    static MultipartEntityBuilder complete(byte[] resultZip) {
        return base()
                .addTextBody("status", "complete")
                .addTextBody("builderId", LibrariesBackendPact.BUILDER_ID)
                .addBinaryBody("data", resultZip, ContentType.create("application/zip"), "package.zip");
    }

    static MultipartEntityBuilder error(String message) {
        return base()
                .addTextBody("status", "error")
                .addTextBody("builderId", LibrariesBackendPact.BUILDER_ID)
                .addTextBody("errors", message);
    }

    private static MultipartEntityBuilder base() {
        return MultipartEntityBuilder.create().setBoundary(BOUNDARY);
    }
}
