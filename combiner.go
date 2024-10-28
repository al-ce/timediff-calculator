// Combine index.html, style.css, and script.js into singlepage.html

package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

const (
	indexFilename  = "index.html"
	styleFilename  = "style.css"
	scriptFilename = "script.js"

	outputFilename = "./singlepage.html"

	styleLinkTag = "<link rel=\"stylesheet\" href=\"" + styleFilename + "\" />"
	scriptTag    = "<script src=\"" + scriptFilename + "\"></script>"
)

func check(e error) {
	if e != nil {
		panic(e)
	}
}

func concatFileContent(lines []string, filename string) []string {
	fileLines, err := os.ReadFile(filename)
	check(err)
	lines = append(lines, strings.Split(string(fileLines), "\n")...)
	return lines
}

func writeCombinedFile(lines []string) int {
	combinedFile, err := os.Create(outputFilename)
	check(err)

	defer combinedFile.Close()

	writer := bufio.NewWriter(combinedFile)
	for _, line := range lines {
		_, err := writer.WriteString(line + "\n")
		check(err)
	}

	writer.Flush()
	return 1
}

func main() {
	indexFile, err := os.Open(indexFilename)
	check(err)

	defer indexFile.Close()

	fileScanner := bufio.NewScanner(indexFile)
	fileScanner.Split(bufio.ScanLines)

	var lines []string
	for fileScanner.Scan() {
		line := fileScanner.Text()
		if strings.Contains(string(line), styleLinkTag) {
			lines = append(lines, "\t\t<style type=\"text/css\">")
			lines = concatFileContent(lines, styleFilename)
			lines = append(lines, "\t\t</style>")
		} else if strings.Contains(string(line), scriptTag) {
			lines = append(lines, "\t\t<script>")
			lines = concatFileContent(lines, scriptFilename)
			lines = append(lines, "\t\t</script>")
		} else {
			lines = append(lines, string(line))
		}
	}

	writeCombinedFile(lines)

	fmt.Printf("TimeDiff Combiner: Wrote %d lines to %s\n", len(lines), outputFilename)
}
