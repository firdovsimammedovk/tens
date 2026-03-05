/**
 * Global Search Tools - Merges TT-NN and TT-Metalium search indexes
 * Extends the standard Sphinx Search object
 */

if (typeof Search !== "undefined") {
  // Store original loadIndex method
  Search._originalLoadIndex = Search.loadIndex;
  Search._ttnnIndex = null;
  Search._metaliumIndex = null;
  Search._indexesLoaded = 0;

  // Override loadIndex to load both indexes
  Search.loadIndex = function(url) {
    const TTNN_INDEX_URL = '../ttnn/searchindex.js';
    const METALIUM_INDEX_URL = '../tt-metalium/searchindex.js';

    // Load first index (TT-NN)
    $.ajax({
      url: TTNN_INDEX_URL,
      dataType: "script",
      cache: true,
      complete: function(jqxhr, textstatus) {
        if (textstatus === "success") {
          // Temporarily capture the index
          Search._ttnnIndex = Search._index;
          Search._index = null;
          Search._indexesLoaded++;
          Search._checkBothLoaded();
        }
      }
    });

    // Load second index (TT-Metalium)
    $.ajax({
      url: METALIUM_INDEX_URL,
      dataType: "script",
      cache: true,
      complete: function(jqxhr, textstatus) {
        if (textstatus === "success") {
          Search._metaliumIndex = Search._index;
          Search._index = null;
          Search._indexesLoaded++;
          Search._checkBothLoaded();
        }
      }
    });
  };

  // Check if both indexes are loaded and merge them
  Search._checkBothLoaded = function() {
    if (Search._indexesLoaded === 2 && Search._ttnnIndex && Search._metaliumIndex) {
      Search._index = Search._mergeIndexes(Search._ttnnIndex, Search._metaliumIndex);
      Search.deferQuery(Search._queued_query);
    }
  };

  // Merge two search indexes
  Search._mergeIndexes = function(index1, index2) {
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
      objnames: {}
    };

    // Helper to merge docnames and create mapping
    const docnameMap1 = {};
    const docnameMap2 = {};

    // Merge index1 (TT-NN) with prefix
    index1.docnames.forEach((docname, idx) => {
      docnameMap1[idx] = merged.docnames.length;
      merged.docnames.push(docname);
      merged.filenames.push('../ttnn/' + index1.filenames[idx]);
      merged.titles.push('[TT-NN] ' + index1.titles[idx]);
    });

    // Merge index2 (TT-Metalium) with prefix
    index2.docnames.forEach((docname, idx) => {
      docnameMap2[idx] = merged.docnames.length;
      merged.docnames.push(docname);
      merged.filenames.push('../tt-metalium/' + index2.filenames[idx]);
      merged.titles.push('[TT-Metalium] ' + index2.titles[idx]);
    });

    // Helper function to merge term dictionaries
    function mergeTermDict(sourceTerms, docMap, targetTerms) {
      for (const term in sourceTerms) {
        const termData = sourceTerms[term];

        if (Array.isArray(termData)) {
          // Remap document indices
          const remappedDocs = termData.map(docIdx => {
            if (typeof docIdx === 'number') {
              return docMap[docIdx];
            }
            return docIdx;
          });

          if (!targetTerms[term]) {
            targetTerms[term] = remappedDocs;
          } else if (Array.isArray(targetTerms[term])) {
            targetTerms[term] = targetTerms[term].concat(remappedDocs);
          }
        } else if (typeof termData === 'object') {
          // Handle nested objects (like in objects, objtypes)
          if (!targetTerms[term]) {
            targetTerms[term] = {};
          }
          for (const key in termData) {
            const value = termData[key];
            if (Array.isArray(value)) {
              const remapped = value.map(v => typeof v === 'number' ? docMap[v] : v);
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

    // Merge all dictionaries
    mergeTermDict(index1.terms || {}, docnameMap1, merged.terms);
    mergeTermDict(index2.terms || {}, docnameMap2, merged.terms);
    mergeTermDict(index1.titleterms || {}, docnameMap1, merged.titleterms);
    mergeTermDict(index2.titleterms || {}, docnameMap2, merged.titleterms);

    // Merge alltitles
    function mergeAllTitles(sourceAllTitles, docMap, targetAllTitles) {
      for (const title in sourceAllTitles) {
        const entries = sourceAllTitles[title];
        if (!targetAllTitles[title]) {
          targetAllTitles[title] = [];
        }
        if (Array.isArray(entries)) {
          entries.forEach(entry => {
            if (Array.isArray(entry) && entry.length >= 2) {
              const newEntry = [docMap[entry[0]], entry[1]];
              if (entry.length > 2) newEntry.push(entry[2]);
              targetAllTitles[title].push(newEntry);
            }
          });
        }
      }
    }

    mergeAllTitles(index1.alltitles || {}, docnameMap1, merged.alltitles);
    mergeAllTitles(index2.alltitles || {}, docnameMap2, merged.alltitles);

    // Merge objects, objtypes, objnames
    mergeTermDict(index1.objects || {}, docnameMap1, merged.objects);
    mergeTermDict(index2.objects || {}, docnameMap2, merged.objects);

    Object.assign(merged.objtypes, index1.objtypes || {});
    Object.assign(merged.objtypes, index2.objtypes || {});
    Object.assign(merged.objnames, index1.objnames || {});
    Object.assign(merged.objnames, index2.objnames || {});

    return merged;
  };
}

