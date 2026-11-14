package view

import "testing"

func TestCoordinatesKey(t *testing.T) {
	tests := []struct {
		name        string
		language    Language
		coordinates LibraryCoordinates
		want        string
		wantErr     bool
	}{
		{
			name:        "maven group and artifact",
			language:    LanguageJava,
			coordinates: LibraryCoordinates{GroupId: "com.fasterxml.jackson.core", ArtifactId: "jackson-databind"},
			want:        "com.fasterxml.jackson.core:jackson-databind",
		},
		{
			name:        "maven classifier is part of the identity",
			language:    LanguageJava,
			coordinates: LibraryCoordinates{GroupId: "org.example", ArtifactId: "lib", Classifier: "jdk17"},
			want:        "org.example:lib:jdk17",
		},
		{
			name:        "maven without artifactId",
			language:    LanguageJava,
			coordinates: LibraryCoordinates{GroupId: "org.example"},
			wantErr:     true,
		},
		{
			name:        "go module path",
			language:    LanguageGo,
			coordinates: LibraryCoordinates{ModulePath: "github.com/spf13/cobra"},
			want:        "github.com/spf13/cobra",
		},
		{
			name:        "go without module path",
			language:    LanguageGo,
			coordinates: LibraryCoordinates{GroupId: "org.example"},
			wantErr:     true,
		},
		{
			name:        "npm package without scope",
			language:    LanguageJs,
			coordinates: LibraryCoordinates{PackageName: "lodash"},
			want:        "lodash",
		},
		{
			name:        "npm scope is joined with a single slash",
			language:    LanguageJs,
			coordinates: LibraryCoordinates{PackageName: "node", Scope: "@types/"},
			want:        "@types/node",
		},
		{
			name:        "unknown language",
			language:    Language("rust"),
			coordinates: LibraryCoordinates{PackageName: "serde"},
			wantErr:     true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := test.coordinates.CoordinatesKey(test.language)
			if test.wantErr {
				if err == nil {
					t.Fatalf("expected an error, got key %q", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != test.want {
				t.Errorf("got %q, want %q", got, test.want)
			}
		})
	}
}

func TestGav(t *testing.T) {
	coordinates := LibraryCoordinates{GroupId: "org.example", ArtifactId: "lib"}
	if got, want := coordinates.Gav("1.2.3"), "org.example:lib:1.2.3"; got != want {
		t.Errorf("got %q, want %q", got, want)
	}

	withClassifier := LibraryCoordinates{GroupId: "org.example", ArtifactId: "lib", Classifier: "jdk17"}
	if got, want := withClassifier.Gav("1.2.3"), "org.example:lib:1.2.3:jdk17"; got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestLanguageValid(t *testing.T) {
	for _, language := range []Language{LanguageJava, LanguageGo, LanguageJs} {
		if !language.Valid() {
			t.Errorf("%q should be valid", language)
		}
	}
	if Language("rust").Valid() {
		t.Error(`"rust" should not be valid`)
	}
	if Language("").Valid() {
		t.Error("the empty language should not be valid")
	}
}
