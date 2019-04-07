// This shows a full config file!
/* eslint quotes: ["error", "double"] */
module.exports = function (grunt) {
    grunt.initConfig({
        stateCacheFile: "data/statecache.json",
        payload: "cat " + "<%= stateCacheFile %>" + " | jq '.'",
        shell: {
            jq: {
                files: "<%= stateCacheFile %>",
                //command: 'echo "<%= payload %>"'
                command: "tmux send -t runner:0.0 '<%=payload %>' Enter"
            },
        },
        watch: {
            // Self Grunt
            grunt: {
                files: ["Gruntfile.js"]
            },
            // Watch State Cache
            stateCache: {
                files: "<%= stateCacheFile %>",
                tasks: ["shell:jq"]
            },
        }
    });

    // load npm tasks
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-shell");

    // define default task
    grunt.registerTask("default", ["watch"]);
};

// vim: fdm=marker ts=4
