package com.netcracker.qubership.apihub.javataskconsumer.debug;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class RepoLayoutTest {

    @Test
    void locateFindsTheRepositoryRootFromTheModuleWorkingDirectory() {
        assertThat(RepoLayout.locate().resolve("java-task-consumer").resolve("pom.xml"))
                .isRegularFile();
    }
}
