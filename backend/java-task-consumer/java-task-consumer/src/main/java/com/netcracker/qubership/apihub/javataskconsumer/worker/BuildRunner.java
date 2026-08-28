package com.netcracker.qubership.apihub.javataskconsumer.worker;

import com.netcracker.qubership.apihub.javataskconsumer.model.BuildTask;

/**
 * Executes a single Java build task (engine dispatch).
 */
@FunctionalInterface
public interface BuildRunner {

    byte[] execute(BuildTask task) throws Exception;
}
