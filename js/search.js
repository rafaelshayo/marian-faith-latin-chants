(function($) {
"use strict";

var editions = {
  'swahili': {label: 'Kiswahili'},
  'vulgate': {label: 'Latin'},
  'douay-rheims': {label: 'English'}
};

//Latin book names as used for the .txt filenames in each edition folder (editions lacking a book simply 404 and are skipped):
var books = ["Genesis","Exodus","Leviticus","Numeri","Deuteronomium","Josue","Judicum","Ruth","Regum 1","Regum 2","Regum 3","Regum 4","Paralipomenon 1","Paralipomenon 2","Esdræ","Nehemiæ","Tobiæ","Judith","Esther","Job","Psalmi","Proverbia","Ecclesiastes","Canticum Canticorum","Sapientia","Ecclesiasticus","Isaias","Jeremias","Lamentationes","Baruch","Ezechiel","Daniel","Osee","Joel","Amos","Abdias","Jonas","Michæa","Nahum","Habacuc","Sophonias","Aggæus","Zacharias","Malachias","Machabæorum 1","Machabæorum 2",
"Matthæus","Marcus","Lucas","Joannes","Actus Apostolorum","Ad Romanos","Ad Corinthios 1","Ad Corinthios 2","Ad Galatas","Ad Ephesios","Ad Philippenses","Ad Colossenses","Ad Thessalonicenses 1","Ad Thessalonicenses 2","Ad Timotheum 1","Ad Timotheum 2","Ad Titum","Ad Philemonem","Ad Hebræos","Jacobi","Petri 1","Petri 2","Joannis 1","Joannis 2","Joannis 3","Judæ","Apocalypsis"];

var chantParts = {'in':'Introitus','gr':'Graduale','tr':'Tractus','al':'Alleluia','sq':'Sequentia','of':'Offertorium','co':'Communio'};

var MAX_PER_GROUP = 60;
var searchToken = 0;

//for matching: lowercase, expand ligatures, strip accents (may change string length):
function norm(s) {
  return (s||'').toLowerCase()
    .replace(/æ/g,'ae').replace(/œ/g,'oe')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
//for locating a match within the original text: length-preserving (no ligature expansion):
function normAlign(s) {
  return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').normalize('NFC');
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

//highlight the query within the text if it can be found ignoring case and accents;
//normAlign is length-preserving so the indices line up with the original text
//(matches that only exist via ligature expansion are shown unhighlighted):
function highlight(text, q) {
  var i = normAlign(text).indexOf(q);
  if(i < 0) return escapeHtml(text);
  return escapeHtml(text.slice(0,i)) + '<b>' + escapeHtml(text.slice(i,i+q.length)) + '</b>' + escapeHtml(text.slice(i+q.length));
}

function snippet(text, q, len) {
  len = len || 160;
  var i = normAlign(text).indexOf(q);
  if(i < 0) i = 0;
  var start = Math.max(0, i - Math.floor((len - q.length)/2));
  var s = (start>0? '…' : '') + text.substr(start, len) + (start+len<text.length? '…' : '');
  return highlight(s, q);
}

function group(title) {
  var $g = $('<div class="search-group"><h3>'+title+'</h3></div>');
  $('#search-results').append($g);
  return {
    el: $g,
    count: 0,
    add: function(html) {
      ++this.count;
      if(this.count > MAX_PER_GROUP) return false;
      $g.append('<div class="search-result">'+html+'</div>');
      return true;
    },
    finish: function() {
      if(this.count > MAX_PER_GROUP) {
        $g.append('<div class="search-more">…and '+(this.count-MAX_PER_GROUP)+' more. Refine your search to see them.</div>');
      } else if(this.count === 0) {
        $g.append('<div class="search-more">No results.</div>');
      }
    }
  };
}

function searchFeasts(q) {
  var g = group('Feasts &amp; Sundays');
  [{keys: (typeof(sundayKeys)!='undefined')? sundayKeys : [], hash:'sunday'},
   {keys: (typeof(saintKeys)!='undefined')? saintKeys : [], hash:'saint'},
   {keys: (typeof(otherKeys)!='undefined')? otherKeys : [], hash:'mass'}].forEach(function(src) {
    src.keys.forEach(function(day) {
      if(!day || !day.key) return;
      var label = day.title || '';
      var en = day.en || '';
      if(norm(label).indexOf(q)<0 && norm(en).indexOf(q)<0) return;
      var display = highlight(label, q) + (en && en!=label? ' <span class="sr-meta">' + highlight(en, q) + '</span>' : '');
      g.add('<a class="sr-title" href="propers.html#'+src.hash+'='+encodeURIComponent(day.key)+'">'+display+'</a>');
    });
  });
  g.finish();
}

function buildChantIndex() {
  var idx = {};   // id -> [{title, incipit, part}]
  [(typeof(gregorianTemporal)!='undefined') && gregorianTemporal,
   (typeof(gregorianSanctoral)!='undefined') && gregorianSanctoral].forEach(function(days) {
    if(!days) return;
    Object.keys(days).forEach(function(key) {
      var day = days[key];
      Object.keys(chantParts).forEach(function(part) {
        var id = day[part+'ID'];
        if(!id) return;
        (idx[id] = idx[id] || []).push({title: day.title, incipit: day[part], part: chantParts[part], ref: day[part+'Ref']});
      });
    });
  });
  return idx;
}
var chantIndex = null;

function searchChants(q) {
  var g = group('Chants');
  if(!chantIndex) chantIndex = buildChantIndex();
  if(typeof(texts)!='undefined') {
    Object.keys(texts).forEach(function(type) {
      Object.keys(texts[type]).forEach(function(id) {
        var text = texts[type][id];
        if(Array.isArray(text)) text = text.join(' ');
        if(typeof(text) != 'string') return;
        var uses = chantIndex[id] || [];
        var incipit = uses.length? uses[0].incipit : text.split(/\s+/).slice(0,6).join(' ');
        var matched = norm(text).indexOf(q)>=0 || norm(incipit).indexOf(q)>=0;
        if(!matched) return;
        var days = uses.map(function(u){return u.title;}).filter(function(v,i,a){return a.indexOf(v)==i;}).slice(0,4).join('; ');
        var ref = uses.length && uses[0].ref? ' ('+uses[0].ref+')' : '';
        g.add('<span class="sr-title">'+highlight(incipit,q)+'</span><span class="sr-meta">'+type+ref+(days? ' — '+escapeHtml(days) : '')+'</span>'+
              '<div class="sr-text">'+snippet(text,q)+'</div>');
      });
    });
  }
  g.finish();
}

//fetch a list of urls with limited concurrency, calling cb(url, textOrNull) for each:
function fetchAll(urls, concurrency, token, cb, done) {
  var i = 0, active = 0;
  function next() {
    if(token != searchToken) return;   // a newer search started
    while(active < concurrency && i < urls.length) {
      ++active;
      (function(url) {
        $.get(url, null, null, 'text').always(function(data, status) {
          --active;
          if(token != searchToken) return;
          cb(url, status=='success'? data : null);
          if(i >= urls.length && active === 0) done();
          else next();
        });
      })(urls[i++]);
    }
    if(urls.length === 0) done();
  }
  next();
}

function searchPsalms(q, rawQuery) {
  var g = group('Psalms');
  var token = searchToken;
  //a plain number goes straight to the psalm tone tool:
  var numMatch = /^(\d{1,3})$/.exec(rawQuery.trim());
  if(numMatch && +numMatch[1]>=1 && +numMatch[1]<=150) {
    g.add('<a class="sr-title" href="psalmtone.html#psalm='+numMatch[1]+'">Psalmus '+numMatch[1]+'</a><span class="sr-meta">open in Psalm Tone Tool</span>');
    g.finish();
    searchDone();
    return;
  }
  var urls = [];
  for(var n=1; n<=150; ++n) urls.push('psalms/' + ('00'+n).slice(-3) + '.txt');
  fetchAll(urls, 12, token, function(url, data) {
    if(!data) return;
    var num = parseInt(url.slice(7,10), 10);
    data.replace(/^﻿/,'').split(/\r?\n/).forEach(function(line, li) {
      if(!line || norm(line).indexOf(q)<0) return;
      g.add('<a class="sr-title" href="psalmtone.html#psalm='+num+'">Psalmus '+num+'</a>'+
            '<div class="sr-text">'+snippet(line,q)+'</div>');
    });
  }, function() {
    g.finish();
    searchDone();
  });
}

function searchReadings(q) {
  var dirs = $('.search-edition:checked').map(function(){return this.value;}).get();
  if(!dirs.length) dirs = ['swahili'];
  var pending = dirs.length;
  dirs.forEach(function(dir) {
    var g = group('Bible readings — ' + (editions[dir]? editions[dir].label : dir));
    var token = searchToken;
    var urls = books.map(function(b){return dir + '/' + b + '.txt';});
    fetchAll(urls, 8, token, function(url, data) {
      if(!data) return;
      var book = decodeURIComponent(url.slice(dir.length+1).replace(/\.txt$/,''));
      $('#search-status').text('Searching ' + book + '…');
      data.replace(/^﻿/,'').split(/\r?\n/).forEach(function(line) {
        var parts = line.split('\t');
        if(parts.length < 3) return;
        var text = parts.slice(2).join('\t');
        if(norm(text).indexOf(q)<0) return;
        g.add('<span class="sr-title">'+escapeHtml(book)+' '+parts[0]+':'+parts[1]+'</span>'+
              '<div class="sr-text">'+snippet(text,q,220)+'</div>');
      });
    }, function() {
      g.finish();
      if(--pending === 0) searchDone();
    });
  });
}

var asyncScopes = 0;
function searchDone() {
  if(--asyncScopes <= 0) $('#search-status').text('');
}

function runSearch() {
  var rawQuery = $('#search-input').val().trim();
  var q = norm(rawQuery);
  $('#search-results').empty();
  $('#search-status').text('');
  ++searchToken;
  if(q.length < 2) {
    $('#search-status').text('Type at least 2 characters and press Search.');
    return;
  }
  var scopes = $('.search-scope:checked').map(function(){return this.value;}).get();
  asyncScopes = 0;
  if(scopes.indexOf('feasts')>=0) searchFeasts(q);
  if(scopes.indexOf('chants')>=0) searchChants(q);
  if(scopes.indexOf('psalms')>=0) { ++asyncScopes; searchPsalms(q, rawQuery); }
  if(scopes.indexOf('readings')>=0) { ++asyncScopes; $('#search-status').text('Searching…'); searchReadings(q); }
}

$(function() {
  $('#search-btn').click(runSearch);
  $('#search-input').keydown(function(e) { if(e.which == 13) runSearch(); });
  var params = /[?#]q=([^&#]+)/.exec(location.href);
  if(params) {
    $('#search-input').val(decodeURIComponent(params[1].replace(/\+/g,' ')));
    runSearch();
  }
});

})(jQuery);
