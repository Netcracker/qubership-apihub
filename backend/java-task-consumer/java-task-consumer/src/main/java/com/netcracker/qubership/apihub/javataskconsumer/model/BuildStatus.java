package com.netcracker.qubership.apihub.javataskconsumer.model;

public enum BuildStatus {
    RUNNING("running"),
    COMPLETE("complete"),
    ERROR("error");

    private final String wireValue;

    BuildStatus(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }
}
