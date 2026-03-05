/**
 * Global Search Tools - merges TT-NN and TT-Metalium Sphinx search indexes.
 */
(function () {
  if (typeof Search === "undefined") {
    return;
  }

  const originalSetIndex = Search.setIndex;

  function getBaseUrl() {
    const path = window.location.pathname;
    const match = path.match(/^(.*)\/(ttnn|tt-metalium)\/[^/]*$/);
    if (match) {
      return match[1];
    }
    return path.replace(/\/[^/]*$/, "");
  }

  function getPathPrefixes() {
    const path = window.location.pathname;
    if (/\/ttnn\//.test(path)) {
      return { ttnn: "", metalium: "../tt-metalium/" };
    }
    if (/\/tt-metalium\//.test(path)) {
      return { ttnn: "../ttnn/", metalium: "" };
    }

    const base = getBaseUrl();
    return {
      ttnn: base + "/ttnn/",
      metalium: base + "/tt-metalium/",
    };
  }

  function mergeTerms(sourceTerms, docMap, targetTerms) {
    for (const term in sourceTerms) {
      const termData = sourceTerms[term];

      if (Array.isArray(termData)) {
        const remappedDocs = termData.map((docIdx) =>
          typeof docIdx === "number" ? docMap[docIdx] : docIdx
        );
        if (!targetTerms[term]) {
          targetTerms[term] = remappedDocs;
        } else if (Array.isArray(targetTerms[term])) {
          targetTerms[term] = targetTerms[term].concat(remappedDocs);
        }
        continue;
      }

      if (termData && typeof termData === "object") {
        if (!targetTerms[term]) {
          targetTerms[term] = {};
        }
        for (const key in termData) {
          const value = termData[key];
          if (Array.isArray(value)) {
            const remapped = value.map((v) => (typeof v === "number" ? docMap[v] : v));
            if (!targetTerms[term][key]) {
              targetTerms[term][key] = remapped;
            } else {
              targetTerms[term][key] = targetTerms[term][key].concat(remapped);
            }
          } else {
            targetTerms[term][key] = value;
          }
        }
      }
    }
  }

  function mergeAllTitles(sourceAllTitles, docMap, targetAllTitles) {
    for (const title in sourceAllTitles) {
      const entries = sourceAllTitles[title];
      if (!targetAllTitles[title]) {
        targetAllTitles[title] = [];
      }
      if (!Array.isArray(entries)) {
        continue;
      }
      entries.forEach((entry) => {
        if (Array.isArray(entry) && entry.length >= 2) {
          const newEntry = [docMap[entry[0]], entry[1]];
          if (entry.length > 2) {
            newEntry.push(entry[2]);
          }
          targetAllTitles[title].push(newEntry);
        }
      });
    }
  }

  function mergeIndexes(index1, index2) {
    const prefixes = getPathPrefixes();

    const merged = {
      docnames: [],
      filenames: [],
      titles: [],
      terms: {},
      titleterms: {},
      envversion: index1.envversion || index2.envversion,
      alltitles: {},
      indexentries: {},
      objects: {},
      objtypes: {},
      objnames: {},
    };

    const docMap1 = {};
    const docMap2 = {};

    index1.docnames.forEach((docname, idx) => {
      docMap1[idx] = merged.docnames.length;
      merged.docnames.push(docname);
      merged.filenames.push(prefixes.ttnn + index1.filenames[idx]);
      merged.titles.push("[TT-NN] " + index1.titles[idx]);
    });

    index2.docnames.forEach((docname, idx) => {
      docMap2[idx] = merged.docnames.length;
      merged.docnames.push(docname);
      merged.filenames.push(prefixes.metalium + index2.filenames[idx]);
      merged.titles.push("[TT-Metalium] " + index2.titles[idx]);
    });

    mergeTerms(index1.terms || {}, docMap1, merged.terms);
    mergeTerms(index2.terms || {}, docMap2, merged.terms);
    mergeTerms(index1.titleterms || {}, docMap1, merged.titleterms);
    mergeTerms(index2.titleterms || {}, docMap2, merged.titleterms);

    mergeAllTitles(index1.alltitles || {}, docMap1, merged.alltitles);
    mergeAllTitles(index2.alltitles || {}, docMap2, merged.alltitles);

    mergeTerms(index1.objects || {}, docMap1, merged.objects);
    mergeTerms(index2.objects || {}, docMap2, merged.objects);

    Object.assign(merged.objtypes, index1.objtypes || {});
    Object.assign(merged.objtypes, index2.objtypes || {});
    Object.assign(merged.objnames, index1.objnames || {});
    Object.assign(merged.objnames, index2.objnames || {});

    return merged;
  }

  Search.loadIndex = function () {
    const base = getBaseUrl();

    // Try multiple possible locations for searchindex files
    const ttnnUrls = [
      base + "/ttnn/searchindex.js",
      base + "/searchindex.js"  // Fallback to root level
    ];

    const metaliumUrls = [
      base + "/tt-metalium/searchindex.js",
      base + "/searchindex.js"  // Fallback to root level
    ];

    let scriptsFinished = 0;
    const captured = [];
    const query = new URLSearchParams(window.location.search).get("q");

    Search.setIndex = function (index) {
      captured.push(index);
    };

    function finishOne() {
      scriptsFinished += 1;
      if (scriptsFinished < 2) {
        return;
      }

      Search.setIndex = originalSetIndex;

      // If both indexes loaded, merge them
      // Note: captured[0] is TT-Metalium, captured[1] is TT-NN
      if (captured.length === 2) {
        originalSetIndex(mergeIndexes(captured[1], captured[0]));
      } else if (captured.length === 1) {
        // Fallback: if only one loaded, use it
        originalSetIndex(captured[0]);
      }

      if (query && Search.hasIndex()) {
        Search.query(query);
      }
    }

    function loadWithFallback(urlList, callback) {
      function tryUrl(index) {
        if (index >= urlList.length) {
          callback();
          return;
        }

        const url = urlList[index];
        const script = document.createElement("script");
        script.src = url;
        script.onload = callback;
        script.onerror = function () {
          tryUrl(index + 1);
        };
        document.body.appendChild(script);
      }

      tryUrl(0);
    }

    loadWithFallback(metaliumUrls, finishOne);
    loadWithFallback(ttnnUrls, finishOne);
  };
})();
