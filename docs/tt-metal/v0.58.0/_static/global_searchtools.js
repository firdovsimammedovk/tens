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
    // Determine base path dynamically
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/'); // Keep empty parts

    // Find the base URL (everything before /ttnn/ or /tt-metalium/)
    let baseUrl = '';
    let foundDoc = false;

    for (let i = 0; i < pathParts.length; i++) {
      if (pathParts[i] === 'ttnn' || pathParts[i] === 'tt-metalium') {
        // Everything before this part is the base URL
        baseUrl = pathParts.slice(0, i).join('/');
        foundDoc = true;
        break;
      }
    }

    // If we didn't find ttnn or tt-metalium in path, assume search.html is at root
    // For path like /tens/tt-metal/search.html, base should be /tens/tt-metal
    if (!foundDoc) {
      baseUrl = pathParts.slice(0, -1).join('/');
    }

    const TTNN_INDEX_URL = baseUrl + '/ttnn/searchindex.js';
    const METALIUM_INDEX_URL = baseUrl + '/tt-metalium/searchindex.js';

    console.log('[Global Search] Current path:', currentPath);
    console.log('[Global Search] Base URL:', baseUrl);
    console.log('[Global Search] Loading TT-NN index from:', TTNN_INDEX_URL);
    console.log('[Global Search] Loading TT-Metalium index from:', METALIUM_INDEX_URL);

    // Load first index (TT-NN) with fallback paths
    const ttnnUrls = [
      TTNN_INDEX_URL,
      baseUrl + '/../ttnn/searchindex.js',  // Parent directory
      '/ttnn/searchindex.js'  // Root level
    ];

    let ttnnLoaded = false;
    function loadTtnnIndex(urls, index) {
      if (index >= urls.length || ttnnLoaded) {
        Search._indexesLoaded++;
        Search._checkBothLoaded();
        return;
      }

      const currentUrl = urls[index];
      $.ajax({
        url: currentUrl,
        dataType: "script",
        cache: true,
        complete: function(jqxhr, textstatus) {
          if (textstatus === "success") {
            console.log('[Global Search] TT-NN index loaded successfully from:', currentUrl);
            ttnnLoaded = true;
            Search._ttnnIndex = Search._index;
            Search._index = null;
            Search._indexesLoaded++;
            Search._checkBothLoaded();
          } else {
            console.log('[Global Search] TT-NN not found at:', currentUrl, '- trying next...');
            loadTtnnIndex(urls, index + 1);
          }
        }
      });
    }

    // Load second index (TT-Metalium) with fallback paths
    const metaliumUrls = [
      METALIUM_INDEX_URL,
      baseUrl + '/../tt-metalium/searchindex.js',  // Parent directory
      '/tt-metalium/searchindex.js'  // Root level
    ];

    let metaliumLoaded = false;
    function loadMetaliumIndex(urls, index) {
      if (index >= urls.length || metaliumLoaded) {
        Search._indexesLoaded++;
        Search._checkBothLoaded();
        return;
      }

      const currentUrl = urls[index];
      $.ajax({
        url: currentUrl,
        dataType: "script",
        cache: true,
        complete: function(jqxhr, textstatus) {
          if (textstatus === "success") {
            console.log('[Global Search] TT-Metalium index loaded successfully from:', currentUrl);
            metaliumLoaded = true;
            Search._metaliumIndex = Search._index;
            Search._index = null;
            Search._indexesLoaded++;
            Search._checkBothLoaded();
          } else {
            console.log('[Global Search] TT-Metalium not found at:', currentUrl, '- trying next...');
            loadMetaliumIndex(urls, index + 1);
          }
        }
      });
    }

    loadTtnnIndex(ttnnUrls, 0);
    loadMetaliumIndex(metaliumUrls, 0);
  };

  // Check if both indexes are loaded and merge them
  Search._checkBothLoaded = function() {
    console.log('[Global Search] Check loaded:', Search._indexesLoaded, 'indexes loaded');
    if (Search._indexesLoaded === 2 && Search._ttnnIndex && Search._metaliumIndex) {
      console.log('[Global Search] Both indexes loaded, merging...');
      Search._index = Search._mergeIndexes(Search._ttnnIndex, Search._metaliumIndex);
      console.log('[Global Search] Merge complete, index has', Search._index.docnames.length, 'documents');
      Search.deferQuery(Search._queued_query);
    }
  };

  // Merge two search indexes
  Search._mergeIndexes = function(index1, index2) {
    // Determine base path dynamically - same logic as loadIndex
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/'); // Keep empty parts

    // Find current doc type (ttnn or tt-metalium)
    let currentDoc = '';
    let baseUrl = '';
    let foundDoc = false;

    for (let i = 0; i < pathParts.length; i++) {
      if (pathParts[i] === 'ttnn' || pathParts[i] === 'tt-metalium') {
        currentDoc = pathParts[i];
        baseUrl = pathParts.slice(0, i).join('/');
        foundDoc = true;
        break;
      }
    }

    // If we didn't find ttnn or tt-metalium in path, we're in root (search.html)
    if (!foundDoc) {
      baseUrl = pathParts.slice(0, -1).join('/');
    }

    // Calculate relative paths based on where we are
    let ttnnPrefix, metaliumPrefix;
    if (currentDoc === 'ttnn') {
      ttnnPrefix = '';
      metaliumPrefix = '../tt-metalium/';
    } else if (currentDoc === 'tt-metalium') {
      ttnnPrefix = '../ttnn/';
      metaliumPrefix = '';
    } else {
      // We're in root (search.html at root), use absolute paths from baseUrl
      ttnnPrefix = baseUrl + '/ttnn/';
      metaliumPrefix = baseUrl + '/tt-metalium/';
    }

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
      merged.filenames.push(ttnnPrefix + index1.filenames[idx]);
      merged.titles.push('[TT-NN] ' + index1.titles[idx]);
    });

    // Merge index2 (TT-Metalium) with prefix
    index2.docnames.forEach((docname, idx) => {
      docnameMap2[idx] = merged.docnames.length;
      merged.docnames.push(docname);
      merged.filenames.push(metaliumPrefix + index2.filenames[idx]);
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
