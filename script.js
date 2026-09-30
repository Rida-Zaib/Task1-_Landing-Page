var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  toggle.addEventListener('click', function(){
    var open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  links.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded','false');
    });
  });

  // ---------- Particle field ----------
  (function(){
    var canvas = document.getElementById('fieldCanvas');
    var hero = document.querySelector('.hero');
    if(!canvas || !hero) return;
    var ctx = canvas.getContext('2d');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var W, H, DPR;
    var nodes = [];
    var NODE_COUNT;
    var LINK_DIST = 130;
    var mouse = { x: null, y: null, active: false };
    var raf = null;

    var palette = ['#33E6C8', '#FF3E9A', '#7C5CFF', '#FFC145'];

    function sizeCanvas(){
      var rect = hero.getBoundingClientRect();
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR,0,0,DPR,0,0);
      NODE_COUNT = Math.round((W * H) / 22000);
      NODE_COUNT = Math.max(24, Math.min(NODE_COUNT, 90));
    }

    function makeNodes(){
      nodes = [];
      for(var i=0;i<NODE_COUNT;i++){
        nodes.push({
          x: Math.random()*W,
          y: Math.random()*H,
          vx: (Math.random()-0.5)*0.35,
          vy: (Math.random()-0.5)*0.35,
          r: 1.4 + Math.random()*1.6,
          c: palette[i % palette.length],
          pulse: Math.random()*Math.PI*2
        });
      }
    }

    function hexToRgb(hex){
      var v = parseInt(hex.slice(1),16);
      return [(v>>16)&255, (v>>8)&255, v&255];
    }
    var rgbCache = {};
    function rgbOf(hex){
      if(!rgbCache[hex]) rgbCache[hex] = hexToRgb(hex);
      return rgbCache[hex];
    }

    function step(){
      ctx.clearRect(0,0,W,H);

      for(var i=0;i<nodes.length;i++){
        var n = nodes[i];
        n.pulse += 0.02;

        // gentle drift
        n.x += n.vx;
        n.y += n.vy;

        // cursor field influence: gentle push away, creating a "field" ripple
        if(mouse.active){
          var dx = n.x - mouse.x, dy = n.y - mouse.y;
          var d2 = dx*dx + dy*dy;
          var radius = 160;
          if(d2 < radius*radius){
            var d = Math.sqrt(d2) || 0.001;
            var force = (1 - d/radius) * 0.6;
            n.x += (dx/d) * force;
            n.y += (dy/d) * force;
          }
        }

        // wrap edges
        if(n.x < -20) n.x = W+20; if(n.x > W+20) n.x = -20;
        if(n.y < -20) n.y = H+20; if(n.y > H+20) n.y = -20;
      }

      // connections
      for(var a=0; a<nodes.length; a++){
        for(var b=a+1; b<nodes.length; b++){
          var na = nodes[a], nb = nodes[b];
          var ddx = na.x-nb.x, ddy = na.y-nb.y;
          var dist = Math.sqrt(ddx*ddx + ddy*ddy);
          if(dist < LINK_DIST){
            var rgb = rgbOf(na.c);
            var alpha = (1 - dist/LINK_DIST) * 0.35;
            ctx.strokeStyle = 'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+','+alpha+')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(na.x, na.y);
            ctx.lineTo(nb.x, nb.y);
            ctx.stroke();
          }
        }
      }

      // nodes
      for(var j=0;j<nodes.length;j++){
        var nn = nodes[j];
        var rgb2 = rgbOf(nn.c);
        var glow = 0.55 + Math.sin(nn.pulse)*0.25;
        ctx.beginPath();
        ctx.fillStyle = 'rgba('+rgb2[0]+','+rgb2[1]+','+rgb2[2]+','+glow+')';
        ctx.arc(nn.x, nn.y, nn.r, 0, Math.PI*2);
        ctx.fill();
      }

      raf = requestAnimationFrame(step);
    }

    function drawStatic(){
      // reduced-motion fallback: one calm frame, no animation loop
      ctx.clearRect(0,0,W,H);
      for(var a=0; a<nodes.length; a++){
        for(var b=a+1; b<nodes.length; b++){
          var na = nodes[a], nb = nodes[b];
          var dist = Math.hypot(na.x-nb.x, na.y-nb.y);
          if(dist < LINK_DIST){
            var rgb = rgbOf(na.c);
            ctx.strokeStyle = 'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+','+(1-dist/LINK_DIST)*0.3+')';
            ctx.beginPath(); ctx.moveTo(na.x,na.y); ctx.lineTo(nb.x,nb.y); ctx.stroke();
          }
        }
      }
      nodes.forEach(function(n){
        var rgb = rgbOf(n.c);
        ctx.beginPath();
        ctx.fillStyle = 'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+',0.7)';
        ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fill();
      });
    }

    function start(){
      sizeCanvas();
      makeNodes();
      if(raf) cancelAnimationFrame(raf);
      step();
    }

    hero.addEventListener('mousemove', function(e){
      var rect = hero.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    });
    hero.addEventListener('mouseleave', function(){ mouse.active = false; });
    hero.addEventListener('touchmove', function(e){
      if(!e.touches || !e.touches[0]) return;
      var rect = hero.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - rect.left;
      mouse.y = e.touches[0].clientY - rect.top;
      mouse.active = true;
    }, {passive:true});

    var resizeTimer;
    window.addEventListener('resize', function(){
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(start, 150);
    });

    start();
  })();

  // ---------- Scroll reveal ----------
  (function(){
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var groups = document.querySelectorAll('.audience-grid, .feature-grid, .steps-row, .quote-strip');
    groups.forEach(function(group){
      Array.prototype.forEach.call(group.children, function(child, i){
        child.style.transitionDelay = (i * 0.09) + 's';
      });
    });

    var items = document.querySelectorAll('.reveal');

    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -60px 0px' });

    items.forEach(function(el){ observer.observe(el); });
  })();
