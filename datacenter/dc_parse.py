import os
import json

txts = [x for x in os.listdir() if (".tsv" in x)]

for filename in txts:
    f = open(filename, 'r', encoding='utf8')
    o = open(filename[:-4]+".json", 'w', encoding='utf8')
    o.write('{\n')
    for line in f:
        dump = str(json.dumps(line))
        x = dump.split('\\t')
        l = list(map((lambda x: x.strip()) , x))
        o.write(str(l[0])+"\": {\"name\": \""+l[1]+"\", \"type\": \""+l[2]+"\", \"icon\": \""+l[3]+"\", \"tooltip\": \""+l[4]+"\"},\n")
    o.write('}\n')
    f.close()
    o.close()
