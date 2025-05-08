# Time Diff Calculator

Web app to calculate the differences of times within a 24hr time period. The subtotals are summed at the bottom row of the table.

Useable with [github.io html preview](https://htmlpreview.github.io/?https://github.com/al-ce/timediff-calculator/blob/main/singlepage.html)

## Usage

<img src="https://github.com/user-attachments/assets/6a70591b-4886-46a3-8c57-e794ecf1d658" width="600" />

New rows are created automatically as needed, or they can be created manually.

Pressing `Y` copies the table in a TSV format to the system clipboard. Here is the output of the above screenshot:

```tsv
08:45	13:45	5
08:45	15:15	6
19:41	01:12	5.52
09:00	09:00	0

		16.52
```

## Single page version

A single page version is available for convenient offline use.

The combination process is automated using `combiner` program built with golang included in the repository. The source code is in [combiner.go](combiner.go). The combiner program assumes the presence of an `./index.html`, `./script.js`, and `./style.css`, and writes the combined content to `./singlepage.html`.
