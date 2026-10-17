-- Leerlingenenquête: korte uitleg onder elke vraag, zodat duidelijk is wat er wordt gevraagd.
-- De vraagteksten zelf blijven gelijk.

update pws_survey_questions q
set config = q.config || jsonb_build_object('toelichting', t.tekst)
from pws_surveys s,
  (values
    (0,  'Kies het leerjaar waar je dit schooljaar in zit.'),
    (1,  'Volg je twee profielen tegelijk, bijvoorbeeld N&G én N&T? Kies dan ‘Combinatie van profielen’.'),
    (2,  'Kies de profielen die je combineert.'),
    (3,  'Selecteer alleen de vakken die je zelf hebt gekozen, naast je verplichte vakken (zoals Nederlands en Engels). Heb je geen keuzevakken? Ga dan door naar de volgende vraag.'),
    (4,  'Geef per reden aan hoe belangrijk die voor jou was toen je je profiel en vakken koos.'),
    (5,  'Denk aan vaardigheden die werkgevers later belangrijk vinden, zoals samenwerken, programmeren of goed kunnen schrijven. Heb je daar bij je keuze aan gedacht?'),
    (6,  'Denk aan het werk dat je later wilt doen. Verandert dat door AI, bijvoorbeeld omdat taken worden overgenomen of anders gaan? Weet je nog niet wat je wilt worden, kies dan de onderste knop.'),
    (7,  'Welke vaardigheden heb je later méér nodig in je werk, nu AI steeds meer kan?'),
    (8,  'Welke vaardigheden heb je later juist minder nodig, omdat AI ze (deels) kan overnemen?'),
    (9,  'Denk aan de vakken die je nu volgt. Leer je daar dingen die je helpen in een baan waarin veel met AI wordt gewerkt?'),
    (10, 'Dacht je bij het kiezen van je profiel en vakken na over wat AI voor je toekomst zou betekenen?'),
    (11, 'Stel je voor dat je nu opnieuw mocht kiezen. Zou je, door wat je nu weet over AI, andere vakken nemen?'),
    (12, 'Noem de vakken die je anders zou kiezen en zeg kort waarom. Eén of twee zinnen is genoeg.'),
    (13, 'Over welke onderwerpen zou je graag meer leren op school?'),
    (14, 'In dit vak leer je hoe AI werkt, hoe je het verstandig gebruikt en hoe je digitaal handig wordt. Zou je dat vak kiezen als het werd aangeboden?'),
    (15, 'Wat mis je op school als je denkt aan je studie of baan later? Eén of twee zinnen is genoeg. Je mag deze vraag ook overslaan.'),
    (16, 'Tel alles mee waarbij je AI gebruikt voor school of om iets te leren, zoals uitleg vragen, samenvatten of oefenen.'),
    (17, 'C&M, E&M, N&G en N&T zijn de vier profielen op het vwo. Passen ze nog bij wat leerlingen later nodig hebben voor studie of werk?')
  ) as t(nr, tekst)
where s.id = q.survey_id and s.slug = 'leerlingen' and q.actief and q.order_index = t.nr;
