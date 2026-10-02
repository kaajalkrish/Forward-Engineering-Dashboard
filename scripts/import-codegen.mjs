#!/usr/bin/env node
// Build public/data/dashboard-data.json from a generated Maven module in codegen_output/.
//
//   node scripts/import-codegen.mjs [moduleDir] [--harness <harness repo>] [--out public/data/dashboard-data.json]
//
// --harness (or HARNESS_ROOT) is the checkout of the COBOL → Java harness; it defaults to the
// folder above this dashboard. With no moduleDir it searches <harness>/codegen_output for the
// first folder holding a pom.xml. Source counts are read from <harness>/source_code_to_analyse.
//
// Rule: only facts found in the files are written as real data. Fixed facts about the
// harness (phases, stages, gates, roles) come from scripts/harness-model.json. Anything the
// module cannot tell us (recorded story/stage statuses, BRD, gate results, costs, timeline…)
// is written as "unknown"/empty and listed in meta.dataSource.missing; nothing is guessed.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dashboardRoot = resolve(here, "..");
const model = JSON.parse(readFileSync(join(here, "harness-model.json"), "utf8"));

// ---------- args ----------
const args = process.argv.slice(2);
const flag = (name) => (args.indexOf(name) >= 0 ? args[args.indexOf(name) + 1] : undefined);
const repoRoot = resolve(flag("--harness") ?? process.env.HARNESS_ROOT ?? resolve(dashboardRoot, ".."));
const outPath = resolve(dashboardRoot, flag("--out") ?? "public/data/dashboard-data.json");
const positional = args.filter((a, i) => !a.startsWith("--") && !["--out", "--harness"].includes(args[i - 1]));
const moduleDir = positional[0] ? resolve(positional[0]) : findModule(join(repoRoot, "codegen_output"), 3);
if (!moduleDir || !existsSync(join(moduleDir, "pom.xml"))) {
  console.error(
    "No Maven module found. Pass the module folder (the one with pom.xml), or point at the harness:\n" +
      "  npm run import -- --harness <path to cobol_java_migrator_v1>",
  );
  process.exit(1);
}

function findModule(dir, depth) {
  if (!existsSync(dir) || depth < 0) return null;
  if (existsSync(join(dir, "pom.xml"))) return dir;
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (d.isDirectory() && d.name !== "target") {
      const hit = findModule(join(dir, d.name), depth - 1);
      if (hit) return hit;
    }
  }
  return null;
}

// ---------- helpers ----------
const walk = (dir) =>
  !existsSync(dir)
    ? []
    : readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
        d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)],
      );
// Normalise Windows line endings so the comment-block patterns match.
const read = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const posix = (p) => p.split(sep).join("/");
const rel = (p) => posix(relative(repoRoot, p));
const uniq = (xs) => [...new Set(xs)];
const storyNum = (id) => {
  const m = id.match(/^US-(N?FR)-(\d+)$/);
  return m ? (m[1] === "FR" ? 0 : 1000) + Number(m[2]) : 9999;
};
const stripRuntimeError = (s) => s.replace(/^RuntimeError:\s*/, "");

const slug = basename(moduleDir);
const mainRoot = join(moduleDir, "src", "main", "java");
const testRoot = join(moduleDir, "src", "test", "java");
const mainFiles = walk(mainRoot).filter((f) => f.endsWith(".java"));
const testFiles = walk(testRoot).filter((f) => f.endsWith(".java"));

// Base package from the @SpringBootApplication class.
const appFile = mainFiles.find((f) => /@SpringBootApplication/.test(read(f)));
const appSrc = appFile ? read(appFile) : "";
const basePackage = (appSrc.match(/^package ([\w.]+);/m) ?? [])[1] ?? "";
const baseDir = join(mainRoot, ...basePackage.split("."));

// ---------- pom ----------
const pom = read(join(moduleDir, "pom.xml"));
const springBoot = (pom.match(/spring-boot-starter-parent<\/artifactId>\s*<version>([^<]+)/) ?? [])[1];
const java = (pom.match(/<java.version>([^<]+)/) ?? [])[1];
const pluginVersion = (artifact) => {
  const m = pom.match(new RegExp(`<artifactId>${artifact}</artifactId>\\s*(?:<version>([^<]+)</version>)?`));
  return m ? { found: true, version: m[1] } : { found: false };
};
const qualityPlugins = [
  ["Error Prone", "error_prone_core"],
  ["SpotBugs", "spotbugs-maven-plugin"],
  ["Checkstyle", "maven-checkstyle-plugin"],
  ["ArchUnit", "archunit-junit5"],
  ["JaCoCo", "jacoco-maven-plugin"],
]
  .map(([name, art]) => ({ name, ...pluginVersion(art) }))
  .filter((p) => p.found)
  .map(({ name, version }) => ({ name, version }));

// ---------- main sources ----------
const MARKER = /TODO\(story:([^ ]+) service:([^)]+)\)/;
const packages = new Map(); // first segment under base package -> stats
const endpoints = [];
let filesWithTodo = 0, stubbed = 0, controllers = 0, entities = 0;

for (const f of mainFiles) {
  const src = read(f);
  const segs = posix(relative(baseDir, f)).split("/");
  const pkg = segs.length > 1 ? segs[0] : "(root)";
  const p = packages.get(pkg) ?? { name: pkg, storyIds: [], service: null, files: 0, controllers: 0, entities: [], filesWithTodo: 0, apis: [] };
  p.files++;
  if (/TODO/.test(src)) { p.filesWithTodo++; filesWithTodo++; }
  if (/UnsupportedOperationException/.test(src)) stubbed++;
  const mk = src.match(MARKER);
  if (mk) {
    p.service = mk[2];
    p.storyIds = uniq([...p.storyIds, ...mk[1].split(",").filter((s) => s && s !== "none")]);
  }
  if (/@RestController/.test(src)) {
    p.controllers++; controllers++;
    const path = (src.match(/@RequestMapping\("([^"]+)"\)/) ?? [])[1];
    const method = ((src.match(/@(Get|Post|Put|Patch|Delete)Mapping/) ?? [])[1] ?? "POST").toUpperCase();
    const cls = (src.match(/public class (\w+)/) ?? [])[1] ?? basename(f, ".java");
    if (path) { p.apis.push({ method, path, name: cls.replace(/Controller$/, "") }); endpoints.push(path); }
  }
  if (/@Entity/.test(src)) {
    entities++;
    const table = (src.match(/@Table\(name\s*=\s*"([^"]+)"\)/) ?? [])[1];
    if (table) p.entities.push(table.toUpperCase());
  }
  packages.set(pkg, p);
}

// Per-story trace blocks prepended to one class (story_runner.py _deterministic_impl_patch,
// `content = trace + content`). Prepended => file order is reverse build order.
const traceRe = /\/\*\s*\n \* Story codegen trace: (\S+)\n \* Acceptance criteria: (.*)\n \* COBOL refs: (.*)\n \* Behavior signals:\n((?: \* - .*\n)*) \* Fallback cause: (.*)\n \*\//g;
const traces = new Map();
const traceOrder = [];
for (const f of mainFiles) {
  for (const m of read(f).matchAll(traceRe)) {
    traceOrder.push(m[1]);
    traces.set(m[1], {
      file: rel(f),
      acs: m[2].split(",").map((s) => s.trim()).filter(Boolean),
      cobol: m[3].trim() === "none" ? [] : m[3].split(",").map((s) => s.trim()).filter(Boolean),
      signals: m[4].split("\n").map((l) => l.replace(/^ \* - /, "").trim()).filter(Boolean),
      fallback: m[5].trim(),
    });
  }
}
const buildOrder = [...traceOrder].reverse();

// ---------- tests ----------
const ideMarker = "Unresolved compilation problem";
const classFor = (javaFile, root, classesDir) => join(moduleDir, "target", classesDir, relative(root, javaFile).replace(/\.java$/, ".class"));
const printable = (buf) => buf.toString("latin1").match(/[ -~]{12,}/g) ?? [];
const compileProblemsIn = (classPath) => {
  if (!existsSync(classPath)) return [];
  const strs = printable(readFileSync(classPath));
  if (!strs.some((s) => s.includes(ideMarker))) return [];
  return uniq(strs.filter((s) => /does not match|Syntax error|cannot be resolved|is undefined|expected/i.test(s)));
};

const tests = testFiles.map((f) => {
  const src = read(f);
  const story = src.match(/^\/\/ story (\S+) acceptance (.*)$/m);
  const cobol = (src.match(/^\/\/ cobol ?(.*)$/m) ?? [])[1] ?? "";
  const declared = (src.match(/^package (.+);/m) ?? [])[1] ?? "";
  const expected = posix(relative(testRoot, dirname(f))).split("/").join(".");
  const signals = {};
  for (const m of src.matchAll(/behavior (\w+) #\d+/g)) signals[m[1]] = (signals[m[1]] ?? 0) + 1;
  return {
    storyId: story ? story[1] : basename(f, ".java"),
    acs: story ? story[2].trim().split(/\s+/) : [],
    cobolRefs: cobol.trim() ? cobol.trim().split(/\s+/) : [],
    file: rel(f),
    className: basename(f, ".java"),
    declaredPackage: declared,
    expectedPackage: expected,
    packageOk: declared === expected,
    testMethods: (src.match(/@Test\b/g) ?? []).length,
    assertions: (src.match(/\bassert\w+\(/g) ?? []).length,
    trivialAssertions:
      (src.match(/assertTrue\(true\b/g) ?? []).length + (src.match(/"[^"]*"\.length\(\) > 0/g) ?? []).length,
    behaviorSignals: signals,
    compileProblems: compileProblemsIn(classFor(f, testRoot, "test-classes")),
  };
});

const allClasses = walk(join(moduleDir, "target")).filter((f) => f.endsWith(".class"));
const ideCompiled = allClasses.some((c) => readFileSync(c).toString("latin1").includes(ideMarker));
const mainProblems = mainFiles.filter((f) => compileProblemsIn(classFor(f, mainRoot, "classes")).length > 0);
const compiledBy = ideCompiled ? "ide" : existsSync(join(moduleDir, "target", "maven-status")) ? "maven" : "unknown";

// ---------- stories ----------
const storyIds = uniq([...tests.map((t) => t.storyId), ...traces.keys()]).sort((a, b) => storyNum(a) - storyNum(b));
const servicePkgFor = (id) => [...packages.values()].find((p) => p.storyIds.includes(id));
const epicFor = (id) => (id.startsWith("US-NFR") ? "NFR" : "FR");

const stories = storyIds.map((id) => {
  const t = tests.find((x) => x.storyId === id);
  const tr = traces.get(id);
  const svc = servicePkgFor(id);
  const acs = uniq([...(t?.acs ?? []), ...(tr?.acs ?? [])]);
  const cobol = uniq([...(t?.cobolRefs ?? []), ...(tr?.cobol ?? [])]);
  const compileFails = t ? !t.packageOk || t.compileProblems.length > 0 : false;
  const trivialOnly = t ? t.assertions > 0 && t.trivialAssertions === t.assertions : false;

  // Story quality checks (codegen/story_quality.py) that the files alone can answer. The
  // other three (test_result_acceptable, package_scope_respected, expected_package_touched)
  // need the Maven result and the story's context pack, which are not in the output, so they
  // are left out rather than guessed.
  const mainBlob = tr ? [id, ...tr.acs, ...tr.cobol, ...tr.signals].join(" ") : "";
  const checks = {
    acceptance_criteria_covered: !!t && acs.length > 0,
    // _cites_lineage: main files cite the story id and, when refs are declared, one of them.
    lineage_cited: !!tr && mainBlob.includes(id) && (cobol.length === 0 || cobol.some((r) => mainBlob.includes(r))),
    production_files_generated: !!tr,
    behavior_signals_represented: !!tr && tr.signals.length > 0,
  };

  // Problems found by reading the code. They are findings, not the harness's status.
  const issues = [];
  if (compileFails) issues.push(`test file declares package "${t.declaredPackage}" (expected ${t.expectedPackage}), so it will not compile`);
  if (trivialOnly) issues.push(`all ${t.assertions} test assertions are placeholders (assertTrue(true) / string length checks)`);
  if (tr) issues.push(`implementation is a trace comment only (${stripRuntimeError(tr.fallback)})`);

  const num = id.replace(/^US-/, "");
  return {
    id,
    epicId: epicFor(id),
    title: `${id.startsWith("US-NFR") ? "Non-functional" : "Functional"} requirement ${num.split("-").pop()}`,
    actor: "—",
    narrative: `Story ${id} generated from BRD requirement ${num}. The story text lives in the BRD/backlog, which was not part of the provided output.`,
    brdRequirementIds: [num],
    acceptanceCriteria: acs.map((a) => ({ id: a, statement: "Statement not in codegen output (see backlog).", covered: !!t })),
    dependsOn: [],
    seamRefs: uniq(cobol.map((r) => r.split(".")[0])),
    evidenceRefs: cobol,
    context: svc?.name ?? "—",
    service: svc?.service ?? "—",
    planOrder: buildOrder.includes(id) ? buildOrder.indexOf(id) + 1 : storyIds.indexOf(id) + 1,
    codegen: {
      // The harness records the status in Postgres (story_codegen_status); not in this output.
      status: "unknown",
      statusSource: "derived",
      generationMode: tr ? stripRuntimeError(tr.fallback) : undefined,
      behaviorSignals: tr?.signals ?? [],
      attempts: 0,
      tests: { total: t?.testMethods ?? 0, passed: 0, failed: 0 },
      // Paths relative to the module root (src/main/java/…, src/test/java/…).
      changedFiles: uniq([
        ...(tr ? [posix(relative(moduleDir, resolve(repoRoot, tr.file)))] : []),
        ...(t ? [posix(relative(moduleDir, resolve(repoRoot, t.file)))] : []),
      ]),
      wallTimeS: 0,
      costUsd: 0,
      qualityGate: {
        passed: null,
        score: Object.values(checks).filter(Boolean).length / Object.values(checks).length,
        checks,
        failures: [],
        warnings: issues,
      },
      rationale:
        "Status not recorded: the harness keeps it in Postgres (story_codegen_status), which was not in the output. " +
        (issues.length ? `Found in the code: ${issues.join("; ")}.` : ""),
    },
  };
});

const epics = ["FR", "NFR"]
  .map((e) => ({
    id: e,
    title: e === "FR" ? "Functional requirements" : "Non-functional requirements",
    outcome: `Stories derived from the BRD's ${e === "FR" ? "functional" : "non-functional"} requirements (grouped by story ID prefix; the real epic list is in the backlog).`,
    brdRequirementIds: stories.filter((s) => s.epicId === e).flatMap((s) => s.brdRequirementIds),
    storyIds: stories.filter((s) => s.epicId === e).map((s) => s.id),
  }))
  .filter((e) => e.storyIds.length);

const traceability = stories.map((s) => {
  const t = tests.find((x) => x.storyId === s.id);
  const svc = servicePkgFor(s.id);
  return {
    id: s.brdRequirementIds[0],
    kind: "requirement",
    title: s.title,
    cobolRefs: s.evidenceRefs,
    epicIds: [s.epicId],
    storyIds: [s.id],
    javaRefs: svc ? svc.apis.map((a) => `${a.name}Controller`) : [],
    testRefs: t ? [t.className] : [],
  };
});

const services = [...packages.values()]
  .filter((p) => p.storyIds.length)
  .map((p) => ({
    name: p.service ?? `${p.name}-service`,
    boundedContext: p.name,
    deployment: "module", // one Maven module
    storyIds: p.storyIds,
    apis: p.apis,
    persistence: p.entities.map((r) => ({ resource: r, accessPattern: "unknown" })),
  }));

// ---------- findings (read from the files) ----------
const badPkg = tests.filter((t) => !t.packageOk);
const findings = [];
if (badPkg.length)
  findings.push({
    severity: "high",
    title: `${badPkg.length} of ${tests.length} test files declare an invalid package`,
    detail: `They declare e.g. "${badPkg[0].declaredPackage}" (backslashes), so they cannot compile. The harness builds the package from a file path with str(Path(...)), which uses "\\" on Windows, then only replaces "/".`,
    where: "src/cobol_modernizer/codegen/story_runner.py:276-278",
  });
const trivial = tests.filter((t) => t.assertions && t.trivialAssertions === t.assertions);
if (trivial.length)
  findings.push({
    severity: "high",
    title: `${trivial.length} of ${tests.length} tests only contain placeholder assertions`,
    detail: "assertTrue(true) and \"…\".length() > 0 checks cite lineage but verify no behaviour; they would pass against any implementation.",
  });
if (traces.size) {
  const first = traces.values().next().value;
  findings.push({
    severity: "high",
    title: `${traces.size} of ${stories.length} stories got only a trace comment as implementation`,
    detail: `Each story's "implementation" is a comment block prepended to ${basename(first.file)} (deterministic fallback: ${stripRuntimeError(first.fallback)}). No business logic was generated.`,
    where: "src/cobol_modernizer/codegen/story_runner.py:442-488",
  });
}
findings.push({
  severity: "medium",
  title: `${filesWithTodo} of ${mainFiles.length} source files are TODO scaffolds; ${stubbed} services throw UnsupportedOperationException`,
  detail: "Controllers return empty responses and entities only carry an id field.",
});
const oddPkgs = [...packages.values()].filter((p) => !p.storyIds.length && /yyyy|exit$/i.test(p.name));
if (oddPkgs.length)
  findings.push({
    severity: "low",
    title: `${oddPkgs.length} scaffold packages are named after COBOL paragraphs, not programs`,
    detail: `e.g. ${oddPkgs.slice(0, 3).map((p) => p.name).join(", ")}.`,
  });
if (compiledBy === "ide")
  findings.push({
    severity: "medium",
    title: "target/ was produced by an IDE compiler, not Maven",
    detail: `The .class files carry "${ideMarker}s", so no mvn verify results exist for this module.`,
  });
const strayTest = tests.find((t) => !packages.has(t.expectedPackage.replace(basePackage + ".", "").split(".")[0]));
if (strayTest)
  findings.push({
    severity: "low",
    title: `Test for ${strayTest.storyId} sits in a package with no production code`,
    detail: `${strayTest.expectedPackage} has no matching main sources.`,
  });

// ---------- artifacts ----------
const shortHash = (files) => {
  const h = createHash("sha256");
  for (const f of [...files].sort()) h.update(posix(relative(moduleDir, f))).update(readFileSync(f));
  const hex = h.digest("hex");
  return `sha256:${hex.slice(0, 4)}…${hex.slice(-4)}`;
};
const newest = (files) => new Date(Math.max(...files.map((f) => statSync(f).mtimeMs))).toISOString();
const artifacts = [
  { id: "A-SRC", kind: "spring_boot_project", label: "Spring Boot module", version: 1, stageKey: "build", objectUri: rel(moduleDir), contentHash: shortHash(mainFiles), createdAt: newest(mainFiles), summary: `${mainFiles.length} source files · ${packages.size} packages · Spring Boot ${springBoot ?? "?"} / Java ${java ?? "?"}` },
  { id: "A-TEST", kind: "generated_tests", label: "Story acceptance tests", version: 1, stageKey: "build", objectUri: rel(testRoot), contentHash: shortHash(testFiles), createdAt: newest(testFiles), summary: `${tests.length} test classes · ${tests.reduce((n, t) => n + t.testMethods, 0)} test methods` },
];

// ---------- stages ----------
// build_stories.py refuses to start Build without these (HTTP 409), so their existence is
// implied by the generated module. Everything else is "not recorded" unless evidenced.
const REQUIRED_BY_BUILD = {
  intake: "the repo directory (build_stories.py:165)",
  parse: "the code graph (stories cite parsed COBOL paragraphs)",
  graph: "the code graph (stories cite parsed COBOL paragraphs)",
  blueprint: "a BRD (build_stories.py:167)",
  backlog: "a backlog (build_stories.py:130)",
  domain: "a domain design (build_stories.py:134)",
  design: "a technical design (build_stories.py:138)",
};
const stages = model.stages.map((s) => {
  if (REQUIRED_BY_BUILD[s.key])
    return { ...s, status: "passed", note: `inferred: Build cannot start without ${REQUIRED_BY_BUILD[s.key]}` };
  if (s.key === "build")
    return { ...s, status: "unknown", note: `ran: ${stories.length} stories generated; the recorded stage status is not in this output` };
  if (s.key === "explore") return { ...s, status: "pending", optional: true, note: "optional Q&A stage; nothing downstream needs it" };
  if (s.key === "verify") return { ...s, status: "pending", note: "no verify report in this output" };
  return { ...s, status: "unknown", note: "not required by Build; its status is not in this output" };
});

const gates = model.gates.map((g) => ({ ...g, status: "open", result: "Not recorded in the provided output" }));

// ---------- source counts ----------
const srcApp = join(repoRoot, "source_code_to_analyse", slug, "app");
const count = (d, re) => walk(join(srcApp, d)).filter((f) => re.test(f)).length;
const counts = existsSync(srcApp)
  ? {
      programs: count("cbl", /\.cbl$/i),
      copybooks: count("cpy", /\.cpy$/i),
      bmsCopybooks: count("cpy-bms", /\.cpy$/i),
      bmsMaps: count("bms", /\.bms$/i),
      jcl: count("jcl", /\.(jcl|prc)$/i),
      cicsPrograms: walk(join(srcApp, "cbl")).filter((f) => /EXEC CICS/i.test(read(f))).length,
      cobolLines: walk(join(srcApp, "cbl")).reduce((n, f) => n + read(f).split("\n").length - 1, 0),
    }
  : model.sourceCounts.carddemo;

// ---------- document ----------
const now = new Date().toISOString();
const data = {
  meta: {
    harnessName: model.harnessName,
    harnessTagline: model.harnessTagline,
    workspace: slug,
    repoSlug: slug,
    sourceRepo: `source_code_to_analyse/${slug}`,
    timezone: "America/New_York",
    graphSnapshot: "not in output",
    brdPath: "not in output",
    codePath: rel(moduleDir),
    basePackage,
    generatedAt: newest([...mainFiles, ...testFiles]),
    updatedAt: now,
    dataSource: {
      mode: "codegen_output",
      importedAt: now,
      modulePath: rel(moduleDir),
      real: [
        `${stories.length} stories, their acceptance-criteria IDs and COBOL lineage`,
        "build order (from prepended trace blocks)",
        "generated files, services, API contracts and entities",
        "test analysis and code findings",
      ],
      missing: [
        { section: "Story titles, narratives, acceptance-criteria text, epics", needs: "backlog (Neo4j) or brd_output" },
        { section: "BRD and judge scores", needs: "brd_output/brd/<slug>/v<N>.html or the :BRD node" },
        { section: "Story and stage statuses recorded by the harness", needs: "Postgres story_codegen_status artifact and journey_stage" },
        { section: "Gate results and approvals", needs: "Postgres gate / approval tables" },
        { section: "Costs and tokens", needs: "Postgres agent_run and budget" },
        { section: "Timeline, work units, feedback", needs: "Postgres agent_run_event / work_unit" },
        { section: "Seams, domain design", needs: "Neo4j (seam candidates, :DomainDesign)" },
        { section: "Equivalence results", needs: "Verify stage report" },
      ],
    },
  },
  weights: model.weights,
  phases: model.phases,
  stages,
  gates,
  agentRoles: model.agentRoles.map((r) => ({ ...r, runs: null, costUsd: null, tokens: null })),
  buildSteps: model.buildSteps,
  artifacts,
  epics,
  stories,
  seams: [],
  contexts: [],
  services,
  traceability,
  quality: {
    brdJudge: null,
    build: {
      gates: [
        {
          key: "compile",
          label: "Compile",
          status: "pending",
          detail: badPkg.length
            ? `not run by Maven; ${badPkg.length} test files have invalid package declarations and will fail to compile${mainProblems.length ? `, ${mainProblems.length} main files too` : ""}`
            : "not run",
        },
        { key: "test", label: "Tests", status: "pending", detail: "not run" },
        ...qualityPlugins
          .filter((p) => p.name !== "JaCoCo")
          .map((p) => ({
            key: p.name.toLowerCase().replace(/\s/g, ""),
            label: p.name,
            status: "pending",
            detail: `configured in pom.xml${p.version ? ` (${p.version})` : ""}; not run${p.name === "ArchUnit" ? "; no ArchUnit rule class was generated" : ""}`,
          })),
      ],
    },
    equivalence: { verdict: "pending", recordsCompared: 0, mismatches: 0, tolerated: 0, tolerances: ["COMP-3 packed decimal", "Zoned overpunch sign", "Implied decimal scale", "Date formats (CCYYMMDD ↔ ISO)"] },
  },
  workUnits: [],
  techStack: {
    ...model.techStack,
    target: model.techStack.target.map((t) =>
      t.name === "Spring Boot" && springBoot ? { ...t, version: springBoot } : t.name === "Java" && java ? { ...t, version: java } : t,
    ),
  },
  timeline: [],
  feedback: [],
  // Only problems read from the files. The harness's own failure records are not in the output.
  failures: tests
    .filter((t) => !t.packageOk || t.compileProblems.length)
    .map((t, i) => ({
      id: `CC-${String(i + 1).padStart(2, "0")}`,
      at: newest([resolve(repoRoot, t.file)]),
      source: "code_check",
      stage: "build",
      ref: t.storyId,
      reason: `${t.className}.java declares package "${t.declaredPackage}"; it should be ${t.expectedPackage}. The test will not compile.`,
      severity: "high",
      status: "open",
    })),
  ask: [],
  inputs: {
    outcome: null,
    sourceRepo: `source_code_to_analyse/${slug}`,
    counts,
    graph: null,
    config: {
      STORY_LLM_IMPL: traces.size ? "0 (from trace blocks: deterministic fast path)" : "unknown",
      CODEGEN_OUTPUT_DIR: rel(dirname(moduleDir)),
    },
  },
  state: {
    currentStage: "build",
    budget: { workspaceCapUsd: 50, runCapUsd: 5, spentUsd: null, killed: false },
    tokens: null,
    agentRuns: [],
  },
  history: [],
  code: {
    modulePath: rel(moduleDir),
    basePackage,
    springBoot,
    java,
    qualityPlugins,
    counts: { mainFiles: mainFiles.length, testFiles: testFiles.length, filesWithTodo, stubbedServices: stubbed, controllers, entities, endpoints: endpoints.length },
    packages: [...packages.values()]
      .filter((p) => p.name !== "(root)")
      .map((p) => ({ name: p.name, kind: p.storyIds.length ? "story-service" : "program-scaffold", storyIds: p.storyIds, files: p.files, controllers: p.controllers, entities: p.entities, filesWithTodo: p.filesWithTodo }))
      .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "story-service" ? -1 : 1)),
    tests: tests.map(({ acs: _a, cobolRefs: _c, className: _n, ...t }) => t),
    compiledBy,
    findings,
  },
};

writeFileSync(outPath, JSON.stringify(data, null, 2) + "\n");
console.log(`Imported ${rel(moduleDir)} → ${posix(relative(dashboardRoot, outPath))}`);
console.log(`  stories ${stories.length} · tests ${tests.length} · main files ${mainFiles.length} · packages ${packages.size} · findings ${findings.length}`);
console.log(`  build order: ${buildOrder.join(" → ") || "unknown"}`);
