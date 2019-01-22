/* eslint-env browser */
;(function () {
  'use strict'

  // Include the POSIX portions of Node's path module, so that we can
  // compute relative paths.
  //
  // The current page's path within the doc tree is stored in
  // windows.antora.pagePath. We compute the relative path between that
  // and all 'internal' search result URLs.

  // Copyright Joyent, Inc. and other Node contributors.
  //
  // Permission is hereby granted, free of charge, to any person
  // obtaining a copy of this software and associated documentation
  // files (the "Software"), to deal in the Software without
  // restriction, including without limitation the rights to use, copy,
  // modify, merge, publish, distribute, sublicense, and/or sell copies
  // of the Software, and to permit persons to whom the Software is
  // furnished to do so, subject to the following conditions:
  //
  // The above copyright notice and this permission notice shall be
  // included in all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  // EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  // NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  // BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  // ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  // CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  // SOFTWARE.

  'use strict'
  var posix = {}

  function isString (arg) {
    return typeof arg === 'string'
  }

  function isObject (arg) {
    return typeof arg === 'object' && arg !== null
  }

  // resolves . and .. elements in a path array with directory names there
  // must be no slashes or device names (c:\) in the array
  // (so also no leading and trailing slashes - it does not distinguish
  // relative and absolute paths)
  function normalizeArray (parts, allowAboveRoot) {
    var res = []
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i]

      // ignore empty parts
      if (!p || p === '.') {
        continue
      }

      if (p === '..') {
        if (res.length && res[res.length - 1] !== '..') {
          res.pop()
        } else if (allowAboveRoot) {
          res.push('..')
        }
      } else {
        res.push(p)
      }
    }

    return res
  }

  // returns an array with empty elements removed from either end of the
  // input array or the original array if no elements need to be removed
  function trimArray (arr) {
    var lastIndex = arr.length - 1
    var start = 0
    for (; start <= lastIndex; start++) {
      if (arr[start]) {
        break
      }
    }

    var end = lastIndex
    for (; end >= 0; end--) {
      if (arr[end]) {
        break
      }
    }

    if (start === 0 && end === lastIndex) {
      return arr
    }

    if (start > end) {
      return []
    }
    return arr.slice(start, end + 1)
  }

  // Split a filename into [root, dir, basename, ext], unix version
  // 'root' is just a slash, or nothing.
  var splitPathRe =
      /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^/]+?|)(\.[^./]*|))(?:[/]*)$/

  function posixSplitPath (filename) {
    return splitPathRe.exec(filename).slice(1)
  }

  // path.resolve([from ...], to)
  posix.resolve = function () {
    var resolvedPath = ''
    var resolvedAbsolute = false

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path = (i >= 0) ? arguments[i] : '/'

      // Skip empty and invalid entries
      if (!isString(path)) {
        throw new TypeError('Arguments to path.resolve must be strings')
      } else if (!path) {
        continue
      }

      resolvedPath = path + '/' + resolvedPath
      resolvedAbsolute = path[0] === '/'
    }

    // At this point the path should be resolved to a full absolute
    // path, but handle relative paths to be safe (might happen when
    // process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeArray(
      resolvedPath.split('/'), !resolvedAbsolute
    ).join('/')

    return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.'
  }

  // path.normalize(path)
  posix.normalize = function (path) {
    var isAbsolute = posix.isAbsolute(path)
    var trailingSlash = path && path[path.length - 1] === '/'

    // Normalize the path
    path = normalizeArray(path.split('/'), !isAbsolute).join('/')

    if (!path && !isAbsolute) {
      path = '.'
    }
    if (path && trailingSlash) {
      path += '/'
    }

    return (isAbsolute ? '/' : '') + path
  }

  posix.isAbsolute = function (path) {
    return path.charAt(0) === '/'
  }

  posix.join = function () {
    var path = ''
    for (var i = 0; i < arguments.length; i++) {
      var segment = arguments[i]
      if (!isString(segment)) {
        throw new TypeError('Arguments to path.join must be strings')
      }
      if (segment) {
        if (!path) {
          path += segment
        } else {
          path += '/' + segment
        }
      }
    }
    return posix.normalize(path)
  }

  // path.relative(from, to)
  posix.relative = function (from, to) {
    from = posix.resolve(from).substr(1)
    to = posix.resolve(to).substr(1)

    var fromParts = trimArray(from.split('/'))
    var toParts = trimArray(to.split('/'))
    var i

    var length = Math.min(fromParts.length, toParts.length)
    var samePartsLength = length
    for (i = 0; i < length; i++) {
      if (fromParts[i] !== toParts[i]) {
        samePartsLength = i
        break
      }
    }

    var outputParts = []
    for (i = samePartsLength; i < fromParts.length; i++) {
      outputParts.push('..')
    }

    outputParts = outputParts.concat(toParts.slice(samePartsLength))

    return outputParts.join('/')
  }

  posix._makeLong = function (path) {
    return path
  }

  posix.dirname = function (path) {
    var result = posixSplitPath(path)
    var root = result[0]
    var dir = result[1]

    if (!root && !dir) {
      // No dirname whatsoever
      return '.'
    }

    if (dir) {
      // It has a dirname, strip trailing slash
      dir = dir.substr(0, dir.length - 1)
    }

    return root + dir
  }

  posix.basename = function (path, ext) {
    var f = posixSplitPath(path)[2]
    if (ext && f.substr(-1 * ext.length) === ext) {
      f = f.substr(0, f.length - ext.length)
    }
    return f
  }

  posix.extname = function (path) {
    return posixSplitPath(path)[3]
  }

  posix.format = function (pathObject) {
    if (!isObject(pathObject)) {
      throw new TypeError(
        "Parameter 'pathObject' must be an object, not " + typeof pathObject
      )
    }

    var root = pathObject.root || ''

    if (!isString(root)) {
      throw new TypeError(
        "'pathObject.root' must be a string or undefined, not " +
        typeof pathObject.root
      )
    }

    var dir = pathObject.dir ? pathObject.dir + posix.sep : ''
    var base = pathObject.base || ''
    return dir + base
  }

  posix.parse = function (pathString) {
    if (!isString(pathString)) {
      throw new TypeError(
        "Parameter 'pathString' must be a string, not " + typeof pathString
      )
    }
    var allParts = posixSplitPath(pathString)
    if (!allParts || allParts.length !== 4) {
      throw new TypeError("Invalid path '" + pathString + "'")
    }
    allParts[1] = allParts[1] || ''
    allParts[2] = allParts[2] || ''
    allParts[3] = allParts[3] || ''

    return {
      root: allParts[0],
      dir: allParts[0] + allParts[1].slice(0, -1),
      base: allParts[2],
      ext: allParts[3],
      name: allParts[2].slice(0, allParts[2].length - allParts[3].length),
    }
  }

  posix.sep = '/'
  posix.delimiter = ':'

  // end of path module inclusion

  // start of search code --------------------------------------------

  var lunr = window.lunr
  var searchInput = document.getElementById('search-input')
  var searchResult = document.createElement('div')
  searchResult.classList.add('results-dropdown')
  searchInput.parentNode.appendChild(searchResult)
  var itemSelector = '#searchui .item'
  var selectedSelector = '#searchui .item.selected'

  // helper function that converts a buffer into a string
  function buffer2str (buf) {
    var a16 = new Uint16Array(buf.buffer)
    var str = ''
    for (var i = 0; i < a16.length; ++i) {
      str += String.fromCharCode(a16[i])
    }
    return str
  }

  // take the compressed index and convert it to an object
  function decompress (str) {
    return JSON.parse(buffer2str(pako.inflate(str)))
  }

  // fetch the index
  function loadIndex (callback) {
    var xhr = new XMLHttpRequest()
    xhr.open('GET', window.antora.basePath + '/search_index.json.gz')
    xhr.responseType = 'arraybuffer'
    xhr.onload = function () {
      if (xhr.status === 200 || xhr.status === 0) {
        var json = decompress(xhr.response)
        callback(Object.assign({
          index: lunr.Index.load(json.index),
          store: json.store,
          components: json.components,
        }))
      } else {
        console.log('Unable to activate the search with Lunr because search_index.json file is missing.')
      }
    }
    xhr.send()
  }

  // compose the DOM nodes representing the page context where the
  // search term exists
  function highlightText (doc, position) {
    var hits = []
    var start = position[0]
    var length = position[1]

    var text = doc.text
    var highlightSpan = document.createElement('span')
    highlightSpan.classList.add('highlight')
    highlightSpan.innerText = text.substr(start, length)

    var end = start + length
    var textEnd = text.length - 1
    var contextOffset = 20
    var contextAfter = end + contextOffset > textEnd ? textEnd : end + contextOffset
    var contextBefore = start - contextOffset < 0 ? 0 : start - contextOffset
    if (start === 0 && end === textEnd) {
      hits.push(highlightSpan)
    } else if (start === 0) {
      hits.push(highlightSpan)
      hits.push(document.createTextNode(text.substr(end, contextAfter)))
    } else if (end === textEnd) {
      hits.push(document.createTextNode(text.substr(0, start)))
      hits.push(highlightSpan)
    } else {
      hits.push(document.createTextNode('...' + text.substr(contextBefore, start - contextBefore)))
      hits.push(highlightSpan)
      hits.push(document.createTextNode(text.substr(end, contextAfter - end) + '...'))
    }
    return hits
  }

  // compose the DOM nodes representing the search results' page title
  function highlightTitle (hash, doc, position) {
    var hits = []
    var start = position[0]
    var length = position[1]

    var highlightSpan = document.createElement('span')
    highlightSpan.classList.add('highlight')
    var title
    if (hash && hash.length && hash !== 'undefined') {
      var titles = doc.titles.filter(function (item) {
        return item.id === hash
      })
      if (!titles.length) {
        console.log('Cannot match hash:', hash, 'to titles:', doc.titles, 'for:', doc.title)
      }
      title = titles.length > 0 ? titles[0].text : doc.title
    } else {
      title = doc.title
    }
    highlightSpan.innerText = title ? title.substr(start, length) : 'Not title here?'

    var end = start + length
    var titleEnd = title.length - 1
    if (start === 0 && end === titleEnd) {
      hits.push(highlightSpan)
    } else if (start === 0) {
      hits.push(highlightSpan)
      hits.push(document.createTextNode(title.substr(length, titleEnd)))
    } else if (end === titleEnd) {
      hits.push(document.createTextNode(title.substr(0, start)))
      hits.push(highlightSpan)
    } else {
      hits.push(document.createTextNode(title.substr(0, start)))
      hits.push(highlightSpan)
      hits.push(document.createTextNode(title.substr(end, titleEnd)))
    }
    return hits
  }

  // get (or create) a facet for the provided doc
  function getFacet (facets, doc, components) {
    var id = facetId(doc)
    if (facets.hasOwnProperty(id)) {
      return facets[id]
    }
    var facet = {
      component: components[doc.component],
      version: doc.version,
      node: document.createElement('div'),
    }
    facet.node.classList.add('facet')
    var title = document.createElement('div')
    title.classList.add('component-title')
    title.innerText = facet.component + ' ' + doc.version
    facet.node.appendChild(title)
    facets[id] = facet
    return facet
  }

  // compute the id for a facet
  function facetId (doc) {
    return doc ? doc.component + ' ' + doc.version : ''
  }

  // compose the DOM nodes representing a search result 'hit', including
  // the page title and a small contextual snippet of the page
  function highlightHit (metadata, hash, doc) {
    var hits = []
    for (var token in metadata) {
      var fields = metadata[token]
      for (var field in fields) {
        var positions = fields[field]
        if (positions.position) {
          var position = positions.position[0] // only highlight the first match
          if (field === 'title') {
            hits = highlightTitle(hash, doc, position)
          } else if (field === 'text') {
            hits = highlightText(doc, position)
          }
        }
      }
    }
    return hits
  }

  // compose the DOM nodes representing a search item
  function createSearchResultItem (doc, item, hits) {
    var documentTitle = document.createElement('div')
    documentTitle.classList.add('title')
    documentTitle.innerText = doc.title
    var documentHit = document.createElement('div')
    documentHit.classList.add('hit')
    var documentHitLink = document.createElement('a')
    documentHitLink.href = relativize(window.antora.pagePath, item.ref)
    documentHit.appendChild(documentHitLink)
    hits.forEach(function (hit) {
      documentHitLink.appendChild(hit)
    })
    var searchResultItem = document.createElement('div')
    searchResultItem.classList.add('item')
    searchResultItem.appendChild(documentTitle)
    searchResultItem.appendChild(documentHit)
    return searchResultItem
  }

  // compute a relative link between here ('from') and the URL.
  function relativize (from, url) {
    if (!from || url.charAt() === '#') return url
    var hash = ''
    var hashIdx = url.indexOf('#')
    if (~hashIdx) {
      hash = url.substr(hashIdx)
      url = url.substr(0, hashIdx)
    }

    if (from === url) {
      return hash || (isDir(url) ? './' : posix.basename(url))
    } else {
      return posix.relative(posix.dirname(from + '.'), url) + (isDir(url) ? '/' + hash : hash)
    }
  }

  // determine if the current string represents a folder
  function isDir (str) {
    return str.charAt(str.length - 1) === '/'
  }

  // create a search results that reports "no results"
  function createNoResult (text) {
    var searchResultItem = document.createElement('div')
    searchResultItem.classList.add('item')
    var documentHit = document.createElement('div')
    documentHit.classList.add('hit')
    var message = document.createElement('strong')
    message.innerText = 'No results found for query "' + text + '"'
    documentHit.appendChild(message)
    searchResultItem.appendChild(documentHit)
    return searchResultItem
  }

  // remove any existing search results
  function resetSearch () {
    // reset search result
    while (searchResult.firstChild) {
      searchResult.removeChild(searchResult.firstChild)
    }
  }

  // search the index and compose the search results
  function searchIndex (index, store, components, text) {
    resetSearch()
    if (text.trim() === '') {
      return
    }
    // var result = index.search(text + '*')

    var result = index.query(function (q) {
      // add query clause for each "word" in the search text
      lunr.tokenizer(text).forEach(function (token) {
        // make exact matches in title have more weight
        q.term(token.toString(), { fields: ['title'], boost: 10, })
        // wildcard matches in titles have normal weight
        q.term(token.toString(), {
          fields: ['title'],
          wildcard: lunr.Query.wildcard.TRAILING
        })

        // make exact matches in content have more weight
        q.term(token.toString(), { fields: ['text'], boost: 5 })
        // wildcard matches in content have normal weight
        q.term(token.toString(), {
          fields: ['text'],
          wildcard: lunr.Query.wildcard.TRAILING
        })
      })
    })

    var searchResultDataset = document.createElement('div')
    searchResultDataset.classList.add('results')
    searchResult.appendChild(searchResultDataset)
    if (result.length > 0) {
      var searchResultCount = document.createElement('div')
      searchResultCount.classList.add('count')
      searchResultCount.innerHTML = '<span>' + result.length + '</span> Match' + (result.length !== 1 ? 'es' : '')
      searchResultDataset.appendChild(searchResultCount)
      var facets = {}
      result.forEach(function (item) {
        var url = item.ref
        var hash
        if (url.includes('#')) {
          hash = url.substring(url.indexOf('#') + 1)
          url = url.replace('#' + hash, '')
        }
        var doc = store[url]
        var facet = getFacet(facets, doc, components)
        var metadata = item.matchData.metadata
        var hits = highlightHit(metadata, hash, doc)
        facet.node.appendChild(createSearchResultItem(doc, item, hits))
      })
      Object.keys(facets).sort(function (a, b) {
        var x = facets[a]
        var y = facets[b]

        // sort components ascending
        if (x.component < y.component) { return -1 }
        if (x.component > y.component) { return 1 }

        // sort versions descending
        var xv = x.version && x.version === 'master' ? 99999999 : x.version || '0'
        var yv = y.version && y.version === 'master' ? 99999999 : y.version || '0'
        var xparts = xv.split('.')
        var yparts = yv.split('.')

        while (xparts.length < yparts.length) { xparts.push('0') }
        while (yparts.length < xparts.length) { yparts.push('0') }

        for (var i = 0; i < xparts.length; ++i) {
          if (xparts[i] === yparts[i]) { continue }
          return (xparts[i] > yparts[i]) ? -1 : 1
        }
        return 0
      }).forEach(function (id) {
        var children = facets[id].node.childNodes
        var ary = []
        ary.forEach.call(children, function (child) {
          searchResultDataset.appendChild(child)
        })
      })
    } else {
      searchResultDataset.appendChild(createNoResult(text))
    }
  }

  // apply timeout to function invocation, to prevent event spamming
  function debounce (func, wait, immediate) {
    var timeout
    return function () {
      var context = this
      var args = arguments
      var later = function () {
        timeout = null
        if (!immediate) func.apply(context, args)
      }
      var callNow = immediate && !timeout
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
      if (callNow) func.apply(context, args)
    }
  }

  // highlight the next search item
  // if no search item is currently selected, or the last item is
  // selected, select the first item
  function nextSearchItem () {
    var item = document.querySelector(selectedSelector)
    if (!item) {
      item = document.querySelector(itemSelector)
      if (item) {
        item.classList.add('selected')
        scrollIntoView(item)
      }
      return
    }

    item.classList.remove('selected')
    var sibling = item.nextElementSibling
    while (sibling) {
      if (sibling.matches(itemSelector)) {
        break
      }
      sibling = sibling.nextElementSibling
    }
    if (!sibling) {
      sibling = document.querySelector(itemSelector)
      if (!sibling) { return }
    }
    if (sibling) {
      sibling.classList.add('selected')
      scrollIntoView(sibling)
    }
  }

  // highlight the previous search item
  // if no search item is currently selected, or the first item is
  // selected, select the last item
  function prevSearchItem () {
    var item = document.querySelector(selectedSelector)
    if (!item) {
      item = document.querySelectorAll(itemSelector)
      if (item) {
        item = item[item.length - 1]
        item.classList.add('selected')
        scrollIntoView(item)
      }
      return
    }

    item.classList.remove('selected')
    var sibling = item.previousElementSibling
    while (sibling) {
      if (sibling.matches(itemSelector)) {
        break
      }
      sibling = sibling.previousElementSibling
    }
    if (!sibling) {
      sibling = document.querySelectorAll(itemSelector)
      if (sibling) {
        sibling = sibling[sibling.length - 1]
      }
    }
    if (sibling) {
      sibling.classList.add('selected')
      scrollIntoView(sibling)
    }
  }

  // visit the link for the selected search item
  // if no item is selected, select the first item and then visit
  function clickSearchItem () {
    var item = document.querySelector(selectedSelector)
    if (!item) {
      item = document.querySelector(itemSelector)
    }
    if (item) {
      var link = item.querySelector('a')
      alert('link:' + link)
      if (link) {
        window.location = link.getAttribute('href')
      }
    }
  }

  // scrolls the provided item into view
  function scrollIntoView (item) {
    var rect = item.getBoundingClientRect()
    var inView = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    )
    if (!inView) {
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  // when the user stops searching, remove the search term and close the
  // results
  function blur () {
    return
    searchInput.value = ''
    resetSearch()
  }

  // load the index, and hookup the events to make searching work
  loadIndex(function (index) {
    var search = debounce(function () {
      searchIndex(index.index, index.store, index.components, searchInput.value)
    }, 100)

    // watch the search field for keypresses
    searchInput.addEventListener('keydown', function (e) {
      var key = e.key
      switch (key) {
        case 'Escape':
          searchInput.blur()
        case 'Enter':
          clickSearchItem()
          break
        case 'ArrowUp':
          prevSearchItem()
          break
        case 'ArrowDown':
          nextSearchItem()
          break
        default:
          search()
      }
    })

    // hookup the blur event
    searchInput.addEventListener('blur', blur)

    // provide a keyboard shortcut to focus the search field
    document.addEventListener('keydown', function (event) {
      var input = document.querySelector('#search-input')
      if (event.target === input) {
        return
      }

      var key = event.key
      if (key === '/') {
        event.preventDefault()
        input.focus()
      }
    })
  })
})()
