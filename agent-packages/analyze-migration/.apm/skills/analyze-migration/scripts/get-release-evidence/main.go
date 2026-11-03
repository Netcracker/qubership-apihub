package main

import (
	"fmt"
	"os"
	"os/exec"
	"regexp"
)

var (
	reRepo     = regexp.MustCompile(`^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$`)
	reRef      = regexp.MustCompile(`^[a-zA-Z0-9_][a-zA-Z0-9_./:+-]*$`)
	reNumber   = regexp.MustCompile(`^[1-9][0-9]*$`)
	reSHA      = regexp.MustCompile(`^[0-9a-f]{7,40}$`)
	reFilePath = regexp.MustCompile(`^[a-zA-Z0-9_./\ -]+$`)
)

func main() {
	if len(os.Args) < 2 {
		die("specify an evidence action")
	}
	action := os.Args[1]
	rest := os.Args[2:]

	switch action {
	case "check":
		expect(len(rest) == 0, "check takes no arguments")
		run("gh", "--version")
		run("gh", "auth", "status")

	case "releases":
		expect(len(rest) == 0, "releases takes no arguments")
		run("gh", "release", "list", "--repo", "Netcracker/qubership-apihub",
			"--limit", "100", "--json", "tagName,name,publishedAt")

	case "release", "pr", "diff", "issue", "commit", "file":
		if action == "file" {
			expect(len(rest) == 3, "use ACTION OWNER/REPOSITORY TAG_OR_NUMBER FILE_PATH")
		} else {
			expect(len(rest) == 2, "use ACTION OWNER/REPOSITORY TAG_OR_NUMBER")
		}
		repo := rest[0]
		ref := rest[1]
		expect(reRepo.MatchString(repo) && !startsDash(repo), "invalid repository")
		expect(reRef.MatchString(ref), "invalid tag, commit, or number")
		if action == "pr" || action == "diff" || action == "issue" {
			expect(reNumber.MatchString(ref), "PR and issue numbers must be positive integers")
		}
		switch action {
		case "release":
			run("gh", "release", "view", ref, "--repo", repo,
				"--json", "tagName,name,url,body,targetCommitish,publishedAt")
		case "pr":
			run("gh", "pr", "view", ref, "--repo", repo,
				"--json", "number,title,body,url,state,mergedAt,mergeCommit,baseRefName,headRefName,files")
		case "diff":
			run("gh", "pr", "diff", ref, "--repo", repo)
		case "issue":
			run("gh", "issue", "view", ref, "--repo", repo,
				"--json", "number,title,body,url,state")
		case "commit":
			run("gh", "api", "--method", "GET", "repos/"+repo+"/commits/"+ref, "--jq", ".sha")
		case "file":
			fp := rest[2]
			expect(reFilePath.MatchString(fp) && !hasPrefix(fp, "/") && !contains(fp, ".."),
				"invalid repository file path")
			run("gh", "api", "--method", "GET", "repos/"+repo+"/contents/"+fp,
				"-f", "ref="+ref, "-H", "Accept: application/vnd.github.raw+json")
		}

	case "tags":
		expect(len(rest) == 1, "tags requires OWNER/REPOSITORY")
		repo := rest[0]
		expect(reRepo.MatchString(repo) && !startsDash(repo), "invalid repository")
		run("gh", "release", "list", "--repo", repo, "--limit", "100", "--json", "tagName,publishedAt")

	case "compare":
		expect(len(rest) == 3, "compare requires OWNER/REPOSITORY BASE HEAD")
		repo, base, head := rest[0], rest[1], rest[2]
		expect(reRepo.MatchString(repo) && !startsDash(repo), "invalid repository")
		expect(reRef.MatchString(base), "invalid base ref")
		expect(reRef.MatchString(head), "invalid head ref")
		run("gh", "api", "--method", "GET",
			"repos/"+repo+"/compare/"+base+"..."+head,
			"--jq", `{status,ahead_by,behind_by,commits:[.commits[]|{sha:.sha,message:.commit.message,date:.commit.author.date}]}`)

	case "pulls":
		expect(len(rest) == 2, "use pulls OWNER/REPOSITORY COMMIT_SHA")
		repo, sha := rest[0], rest[1]
		expect(reRepo.MatchString(repo) && !startsDash(repo), "invalid repository")
		expect(reSHA.MatchString(sha), "invalid commit SHA")
		run("gh", "api", "--method", "GET", "repos/"+repo+"/commits/"+sha+"/pulls",
			"--jq", `[.[] | {number, title, url, state}]`)

	case "local-show":
		expect(len(rest) == 3 && !startsDash(rest[1]) && !startsDash(rest[2]),
			"use local-show CLONE_PATH REF FILE_PATH")
		runGit(rest[0], "show", "--no-ext-diff", "--no-textconv", rest[1]+":"+rest[2])

	case "local-diff":
		expect(len(rest) == 4 && !startsDash(rest[1]) && !startsDash(rest[2]),
			"use local-diff CLONE_PATH OLD_REF NEW_REF FILE_PATH")
		runGit(rest[0], "diff", "--no-ext-diff", "--no-textconv", rest[1], rest[2], "--", rest[3])

	default:
		die("unsupported evidence action")
	}
}

func run(name string, args ...string) {
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		os.Exit(1)
	}
}

func runGit(clonePath string, args ...string) {
	fullArgs := append([]string{"--no-pager", "-C", clonePath}, args...)
	cmd := exec.Command("git", fullArgs...)
	cmd.Env = append(os.Environ(), "GIT_OPTIONAL_LOCKS=0")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		os.Exit(1)
	}
}

func expect(cond bool, msg string) {
	if !cond {
		die(msg)
	}
}

func die(msg string) {
	fmt.Fprintln(os.Stderr, msg)
	os.Exit(1)
}

func startsDash(s string) bool { return len(s) > 0 && s[0] == '-' }
func hasPrefix(s, p string) bool {
	return len(s) >= len(p) && s[:len(p)] == p
}
func contains(s, sub string) bool {
	if len(sub) == 0 || len(s) < len(sub) {
		return false
	}
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
