package org.qubership.jdiff.pipeline;

import java.nio.file.Path;
import java.util.List;
import org.qubership.jdiff.resolve.EffectivePomBuilder;
import org.qubership.jdiff.resolve.MavenModule;
import org.qubership.jdiff.resolve.ProjectScanner;

/**
 * Test double that returns a fixed list of modules regardless of the scanned path, bypassing real
 * POM parsing entirely.
 */
class FakeProjectScanner extends ProjectScanner {

    private final List<MavenModule> modules;

    FakeProjectScanner(EffectivePomBuilder pomBuilder, List<MavenModule> modules) {
        super(pomBuilder);
        this.modules = modules;
    }

    @Override
    public List<MavenModule> scan(Path projectRoot) {
        return modules;
    }
}
