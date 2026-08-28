package com.netcracker.qubership.apihub.javataskconsumer.model;

import java.nio.file.Path;

public record BuildTask(JavaBuildConfig config, Path sourcesZip) {

    public String publishId() {
        return config.publishId();
    }

    public String packageId() {
        return config.packageId();
    }
}
