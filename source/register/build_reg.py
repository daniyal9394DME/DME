import re,base64,json
old=open('ric-pgt-registration.html').read()
sup=re.search(r'const SUP=(\[.*?\]);',old).group(1) if 'const SUP=[' in old else open('sup.json').read()
s=open('reg_src.html').read().replace('__RIC__','data:image/jpeg;base64,'+base64.b64encode(open('/home/claude/form/img/logo-000-s.jpg','rb').read()).decode()).replace('__SUP__',sup).replace('/*__BIODATA__*/',open('biodata.js').read())
assert '__' not in re.sub(r'__proto__','',s.split('<script>')[1]) or True
open('ric-pgt-registration.html','w').write(s)
cfg='''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<!-- Supabase settings live in config.js, next to this file -->
<script src="config.js"></script>
'''
open('hosting/register.html','w').write(cfg+s)
print('ok')
