data request:
http://voyages.sdss.org/launch/milky-way/sdss-constellations/discovering-constellations-using-sdss-plates/

select top 1000 soa.xfocal as x, soa.yfocal as y
from specphotoAll as spa
join specObjAll as soa on soa.specObjID = spa.specObjID
where spa.plate = 10475
and spa.dered_r > 0
order by spa.dered_r asc

select top 1000 spa.ra, spa.dec, spa.dered_r as magnitude, spa.class, spa.z, soa.xfocal as x, soa.yfocal as y, soa.ra, soa.dec
from specphotoAll as spa
join specObjAll as soa on soa.specObjID = spa.specObjID
where spa.plate = 10475
and spa.dered_r > 0
order by spa.dered_r asc
