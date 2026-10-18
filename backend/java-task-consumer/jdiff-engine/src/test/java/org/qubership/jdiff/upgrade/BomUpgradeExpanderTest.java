package org.qubership.jdiff.upgrade;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URISyntaxException;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.qubership.jdiff.model.Gav;
import org.qubership.jdiff.resolve.EffectivePomBuilder;
import org.qubership.jdiff.resolve.ResolvedDependency;

class BomUpgradeExpanderTest {

    @Test
    void expandsOnlyTheDependencyWhoseManagedVersionChanged() throws URISyntaxException {
        Path fixturesDir = Path.of(getClass().getResource("/upgrade").toURI());
        EffectivePomBuilder pomBuilder = new EffectivePomBuilder(new FakeArtifactResolver(fixturesDir));
        BomUpgradeExpander expander = new BomUpgradeExpander(pomBuilder);

        Gav oldBom = new Gav("org.example", "bom", "old", null);
        List<ResolvedDependency> treeDeps = List.of(
                new ResolvedDependency(new Gav("org.example", "lib-a", "2.5", null), "compile", false, 0),
                new ResolvedDependency(new Gav("org.example", "lib-b", "3.0", null), "compile", false, 1));

        List<UpgradeItem> items = expander.expand(oldBom, "new", treeDeps);

        assertThat(items).containsExactly(new UpgradeItem("org.example", "lib-a", "2.5", "2.6", true));
    }

    @Test
    void expandsTransitiveTreeDependencyWhoseManagedVersionChanged() throws URISyntaxException {
        Path fixturesDir = Path.of(getClass().getResource("/upgrade").toURI());
        EffectivePomBuilder pomBuilder = new EffectivePomBuilder(new FakeArtifactResolver(fixturesDir));
        BomUpgradeExpander expander = new BomUpgradeExpander(pomBuilder);

        Gav oldBom = new Gav("org.example", "bom", "old", null);
        List<ResolvedDependency> treeDeps = List.of(
                new ResolvedDependency(new Gav("org.example", "lib-a", "2.5", null), "compile", false, 2));

        List<UpgradeItem> items = expander.expand(oldBom, "new", treeDeps);

        assertThat(items).containsExactly(new UpgradeItem("org.example", "lib-a", "2.5", "2.6", false));
    }

    @Test
    void returnsEmptyWhenTheNewBomManagesNoTreeDependencyOfTheModule() throws URISyntaxException {
        Path fixturesDir = Path.of(getClass().getResource("/upgrade").toURI());
        EffectivePomBuilder pomBuilder = new EffectivePomBuilder(new FakeArtifactResolver(fixturesDir));
        BomUpgradeExpander expander = new BomUpgradeExpander(pomBuilder);

        Gav oldBom = new Gav("org.example", "bom", "old", null);
        List<ResolvedDependency> treeDeps = List.of(
                new ResolvedDependency(new Gav("org.example", "unrelated-lib", "1.0", null), "compile", false, 0));

        List<UpgradeItem> items = expander.expand(oldBom, "new", treeDeps);

        assertThat(items).isEmpty();
    }

    @Test
    void expandsFromNewBomAgainstTreeWhenOldBomIsUnknown() throws URISyntaxException {
        Path fixturesDir = Path.of(getClass().getResource("/upgrade").toURI());
        EffectivePomBuilder pomBuilder = new EffectivePomBuilder(new FakeArtifactResolver(fixturesDir));
        BomUpgradeExpander expander = new BomUpgradeExpander(pomBuilder);

        Gav newBom = new Gav("org.example", "bom", "new", null);
        List<ResolvedDependency> treeDeps = List.of(
                new ResolvedDependency(new Gav("org.example", "lib-a", "2.5", null), "compile", false, 1));

        List<UpgradeItem> items = expander.expandFromNewBom(newBom, treeDeps);

        assertThat(items).containsExactly(new UpgradeItem("org.example", "lib-a", "2.5", "2.6", false));
    }
}
