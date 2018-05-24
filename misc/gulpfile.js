"use strict";
///<reference path="node_modules/@types/node/index.d.ts"/>
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var gulpclass_1 = require("gulpclass");
var gulp = require("gulp");
var del = require("del");
var replace = require("gulp-replace");
var shell = require("gulp-shell");
var ts = require("gulp-typescript");
var sourcemaps = require("gulp-sourcemaps");
var install = require("gulp-install");
var fs = require("fs");
var mergeStream = require("merge-stream");
var path = require("path");
var Gulpfile = /** @class */ (function () {
    function Gulpfile() {
    }
    Gulpfile.prototype.clean = function (cb) {
        return del(["./build/**"], cb);
    };
    Gulpfile.prototype.samples = function () {
        return ["package", "compileSamples", "installModules", "copyServerlessFiles", "copyPublicFiles"];
    };
    Gulpfile.prototype.compileSamples = function () {
        var folders = this.getFolders("./samples");
        var tasks = folders.map(function (sampleFolder) {
            var buildDestination = "./build/samples/" + sampleFolder + "/";
            var tsProject = ts.createProject("./samples/tsconfig.json", { typescript: require("typescript") });
            var tsResult = gulp.src(["./samples/" + sampleFolder + "/**/*.ts", "./node_modules/@types/**/*.ts"])
                .pipe(replace("../../../src", "tyx"))
                .pipe(replace("../../src", "tyx"))
                .pipe(sourcemaps.init())
                .pipe(tsProject());
            return mergeStream([
                tsResult.dts.pipe(gulp.dest(buildDestination)),
                tsResult.js
                    .pipe(sourcemaps.write(".", { sourceRoot: "", includeContent: true }))
                    .pipe(gulp.dest(buildDestination))
            ]);
        });
        return mergeStream(tasks);
    };
    Gulpfile.prototype.installModules = function () {
        var folders = this.getFolders("./build/samples");
        var tasks = folders.map(function (sampleFolder) {
            var packageJsonSourcePath = "./samples/" + sampleFolder + "/package.json";
            var installPath = "./build/samples/" + sampleFolder;
            return gulp.src([packageJsonSourcePath])
                .pipe(gulp.dest(installPath))
                .pipe(install({
                npm: ""
            }))
                .pipe(install({
                npm: " --save ../../package/"
            }));
        });
        return mergeStream(tasks);
    };
    Gulpfile.prototype.copyServerlessFiles = function () {
        var folders = this.getFolders("./samples");
        var tasks = folders.map(function (sampleFolder) {
            var serverlessYmlSourcePath = "./samples/" + sampleFolder + "/serverless.yml";
            var copyToPath = "./build/samples/" + sampleFolder;
            return gulp.src([serverlessYmlSourcePath])
                .pipe(gulp.dest(copyToPath));
        });
        return mergeStream(tasks);
    };
    Gulpfile.prototype.copyPublicFiles = function () {
        var folders = this.getFolders("./samples");
        var tasks = folders.map(function (sampleFolder) {
            var publicSourcePath = "./samples/" + sampleFolder + "/public/**/*";
            var copyToPath = "./build/samples/" + sampleFolder + "/public";
            return gulp.src([publicSourcePath])
                .pipe(gulp.dest(copyToPath));
        });
        return mergeStream(tasks);
    };
    Gulpfile.prototype.getFolders = function (dir) {
        return fs.readdirSync(dir)
            .filter(function (file) {
            return fs.statSync(path.join(dir, file)).isDirectory();
        });
    };
    ///// ---------------------------------------------------------------------------------
    /**
     * Removes /// <reference from compiled sources.
     */
    Gulpfile.prototype.packageReplaceReferences = function () {
        return gulp.src("./build/package/**/*.d.ts")
            .pipe(replace("/// <reference types=\"node\" />", ""))
            .pipe(replace("/// <reference types=\"express\" />", ""))
            .pipe(gulp.dest("./build/package"));
    };
    /**
     * Change the "private" state of the packaged package.json file to public.
     */
    Gulpfile.prototype.packagePreparePackageFile = function () {
        return gulp.src("package.json")
            .pipe(replace("\"private\": true,", "\"private\": false,"))
            .pipe(gulp.dest("./build/package"));
    };
    /**
     * Copies README.md into the package.
     */
    Gulpfile.prototype.packageCopyReadme = function () {
        return gulp.src("./README.md")
            // .pipe(replace(/```typescript([\s\S]*?)```/g, "```javascript$1```"))
            .pipe(gulp.dest("./build/package"));
    };
    /**
     * Copies src into the package.
     */
    Gulpfile.prototype.packageSource = function () {
        return gulp.src("./src/**/*")
            // .pipe(replace(/```typescript([\s\S]*?)```/g, "```javascript$1```"))
            .pipe(gulp.dest("./build/package"));
    };
    /**
     * Compiles all sources to the package directory.
     */
    Gulpfile.prototype.packageCompile = function () {
        var tsProject = ts.createProject("tsconfig.json", { typescript: require("typescript") });
        var tsResult = gulp.src(["./src/**/*.ts", "./node_modules/@types/**/*.ts"])
            .pipe(sourcemaps.init())
            .pipe(tsProject());
        return [
            tsResult.dts.pipe(gulp.dest("./build/package")),
            tsResult.js
                .pipe(sourcemaps.write(".", { sourceRoot: "", includeContent: true }))
                .pipe(gulp.dest("./build/package"))
        ];
    };
    /**
     * Compiles all sources to the package directory.
     */
    Gulpfile.prototype.localCompile = function () {
        var tsProject = ts.createProject("tsconfig.json", { typescript: require("typescript") });
        var tsResult = gulp.src(["./src/**/*.ts", "./node_modules/@types/**/*.ts"])
            .pipe(sourcemaps.init())
            .pipe(tsProject());
        return [
            tsResult.dts.pipe(gulp.dest("./build/local")),
            tsResult.js
                .pipe(sourcemaps.write(".", { sourceRoot: "", includeContent: true }))
                .pipe(gulp.dest("./build/local"))
        ];
    };
    /**
     * Change the "private" state of the packaged package.json file to public.
     */
    Gulpfile.prototype.localPreparePackage = function () {
        return gulp.src("package.json")
            // .pipe(replace("\"private\": true,", "\"private\": false,"))
            .pipe(gulp.dest("./build/local"));
        // .pipe(install({
        //     npm: " --production"
        // } as any));
    };
    /**
     * Creates a package that can be published to npm.
     */
    Gulpfile.prototype.local = function () {
        return [
            "clean",
            "localCompile",
            "localPreparePackage"
        ];
    };
    /**
     * Creates a package that can be published to npm.
     */
    Gulpfile.prototype.package = function () {
        return [
            "clean",
            "packageCompile",
            [
                "packageReplaceReferences",
                "packagePreparePackageFile",
                "packageCopyReadme",
                "packageSource"
            ]
        ];
    };
    /**
     * Publishes a package to npm from ./build/package directory.
     */
    Gulpfile.prototype.packagePublish = function () {
        return gulp.src("package.json", { read: false })
            .pipe(shell([
            "cd ./build/package && npm publish"
        ]));
    };
    /**
     * Publishes a package to npm from ./build/package directory with @beta tag.
     */
    Gulpfile.prototype.packagePublishBeta = function () {
        return gulp.src("package.json", { read: false })
            .pipe(shell([
            "cd ./build/package && npm publish --tag beta"
        ]));
    };
    /**
     * Publishes a package to npm from ./build/package directory with @next tag.
     */
    Gulpfile.prototype.packagePublishNext = function () {
        return gulp.src("package.json", { read: false })
            .pipe(shell([
            "cd ./build/package && npm publish --tag next"
        ]));
    };
    /**
     * Creates a package and publishes it to npm.
     */
    Gulpfile.prototype.publish = function () {
        return ["package", "packagePublish"];
    };
    /**
     * Creates a package and publishes it to npm with @next tag.
     */
    Gulpfile.prototype.publishBeta = function () {
        return ["package", "packagePublishBeta"];
    };
    /**
     * Creates a package and publishes it to npm with @next tag.
     */
    Gulpfile.prototype.publishNext = function () {
        return ["package", "packagePublishNext"];
    };
    __decorate([
        gulpclass_1.Task()
    ], Gulpfile.prototype, "clean", null);
    __decorate([
        gulpclass_1.SequenceTask()
    ], Gulpfile.prototype, "samples", null);
    __decorate([
        gulpclass_1.Task()
    ], Gulpfile.prototype, "compileSamples", null);
    __decorate([
        gulpclass_1.Task()
    ], Gulpfile.prototype, "installModules", null);
    __decorate([
        gulpclass_1.Task()
    ], Gulpfile.prototype, "copyServerlessFiles", null);
    __decorate([
        gulpclass_1.Task()
    ], Gulpfile.prototype, "copyPublicFiles", null);
    __decorate([
        gulpclass_1.Task()
    ], Gulpfile.prototype, "packageReplaceReferences", null);
    __decorate([
        gulpclass_1.Task()
    ], Gulpfile.prototype, "packagePreparePackageFile", null);
    __decorate([
        gulpclass_1.Task()
    ], Gulpfile.prototype, "packageCopyReadme", null);
    __decorate([
        gulpclass_1.Task()
    ], Gulpfile.prototype, "packageSource", null);
    __decorate([
        gulpclass_1.MergedTask()
    ], Gulpfile.prototype, "packageCompile", null);
    __decorate([
        gulpclass_1.MergedTask()
    ], Gulpfile.prototype, "localCompile", null);
    __decorate([
        gulpclass_1.Task()
    ], Gulpfile.prototype, "localPreparePackage", null);
    __decorate([
        gulpclass_1.SequenceTask()
    ], Gulpfile.prototype, "local", null);
    __decorate([
        gulpclass_1.SequenceTask()
    ], Gulpfile.prototype, "package", null);
    __decorate([
        gulpclass_1.Task()
    ], Gulpfile.prototype, "packagePublish", null);
    __decorate([
        gulpclass_1.Task()
    ], Gulpfile.prototype, "packagePublishBeta", null);
    __decorate([
        gulpclass_1.Task()
    ], Gulpfile.prototype, "packagePublishNext", null);
    __decorate([
        gulpclass_1.SequenceTask()
    ], Gulpfile.prototype, "publish", null);
    __decorate([
        gulpclass_1.SequenceTask("publish-beta")
    ], Gulpfile.prototype, "publishBeta", null);
    __decorate([
        gulpclass_1.SequenceTask("publish-next")
    ], Gulpfile.prototype, "publishNext", null);
    Gulpfile = __decorate([
        gulpclass_1.Gulpclass()
    ], Gulpfile);
    return Gulpfile;
}());
exports.Gulpfile = Gulpfile;
