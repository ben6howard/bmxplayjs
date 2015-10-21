BmxplayJS
=========

Bmxplay, JavaScript version. Written in "modern" OOP with closures (where applicable).

Web Audio API is pretty terrible. I didn't figure out how to use arbitrary size buffers
without a clicking noise so I just used 2 or 3 250 ms buffers (11050 samples each, at 44100 Hz)
and played them in a loop using scheduling, i.e. node.start(nextTime).
