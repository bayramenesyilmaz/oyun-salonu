import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
pv = '--preview' in sys.argv
reset(samples=96, w=900, h=1100, preview=pv)
world_hdri('rooftop_night', 0.6)
x = 0
for i, who in enumerate(['arda', 'elif', 'mert', 'zeynep', 'kaan']):
    person(who, loc=((i - 2) * 0.75, 0, 0), face={'AK_44_MouthSmileLeft': 0.25, 'AK_45_MouthSmileRight': 0.25})
plane('floor', (10, 10), (0, 0, 0), pbr('concrete_pavers', 1))
area((1.5, -2.5, 2.6), (0, 0, 1.4), 300, 1.5, (1, 0.85, 0.7))
area((-2.5, -1.0, 2.0), (0, 0, 1.4), 120, 2, (0.6, 0.7, 1.0))
area((0, 2.5, 2.5), (0, 0, 1.6), 200, 1.0, (0.9, 0.9, 1))
camera((0, -4.6, 1.25), (0, 0, 1.0), lens=40)
render(sys.argv[-1])
