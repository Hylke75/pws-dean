-- Engelse teksten voor de startconfiguratie van de interviewmodule.

update public.pws_iv_vragen q set tekst_en = t.en
from (values
  ('alg_1', 'In your view, how is AI influencing the way people work today?'),
  ('alg_2', 'What changes do you expect AI to bring to the labour market over the next five to ten years?'),
  ('alg_3', 'Do you think AI will ultimately make more jobs disappear, or will it create new ones? Why?'),
  ('alg_4', 'Which skills do you think will become more important for people entering the workforce?'),
  ('alg_5', 'Are there particular groups of workers who you think are more at risk because of AI? Could you explain why?'),
  ('alg_6', 'What do you think the Netherlands should be doing now to prepare well for the changes brought by AI?'),
  ('ai_1', 'Which tasks can AI systems already carry out on their own today, and where do they still really need people?'),
  ('ai_2', 'Which professions do you expect to change most because of AI over the next five years? Why those in particular?'),
  ('ai_3', 'Do you think AI will mainly remain a supporting tool, or could it take over entire jobs in the future?'),
  ('ai_4', 'What do you see as the main limitations of AI that mean human workers will still be needed?'),
  ('ai_5', 'If you were 17 or 18 now and had to choose what to study, how would AI influence your choice?'),
  ('docent_1', 'How do you notice students using AI in their schoolwork these days?'),
  ('docent_2', 'Which skills do you think students should learn at school so that they can work well with AI later on?'),
  ('docent_3', 'Do you think education currently pays enough attention to AI? What should change?'),
  ('docent_4', 'Does AI change what students need to learn themselves and what they may do with the help of technology?'),
  ('docent_5', 'What advice would you give a final-year pre-university (vwo) student who will soon choose a degree and wants to take the rise of AI into account?'),
  ('hr_1', 'In what ways is AI used within your organisation, and how do employees notice this?'),
  ('hr_2', 'Has AI already affected the number of employees you need, or the roles you hire people for?'),
  ('hr_3', 'Is knowledge of AI becoming more important when hiring new employees? Could you give an example?'),
  ('hr_4', 'How does your organisation help employees learn to work with AI? And what happens to employees who find this difficult?'),
  ('hr_5', 'What do you expect to change over the next five years in the way organisations recruit and hire staff?'),
  ('st_1', 'What are you studying or what work do you do now, and why did you choose it?'),
  ('st_2', 'Has the development of AI influenced your choice of study or career? Why or why not?'),
  ('st_3', 'Which tasks in your future profession do you think AI could take over?'),
  ('st_4', 'Do you think AI will make it harder or easier to find a job after your studies? Why?'),
  ('st_5', 'Do you feel you learn enough during your studies about AI and how it will be used in your future work?'),
  ('wg_1', 'What does your company currently use AI for?'),
  ('wg_2', 'Could you give an example of a task that AI now does faster, more cheaply or differently?'),
  ('wg_3', 'Has using AI meant that you need fewer people, have created new roles, or have changed existing roles?'),
  ('wg_4', 'What are the biggest advantages and disadvantages of AI for your company?'),
  ('wg_5', 'What would you advise young people preparing for a career in a world where AI can do more and more tasks?'),
  ('wn_1', 'What kind of work do you do, and how is AI currently used in your work?'),
  ('wn_2', 'Are there tasks you used to do yourself that are now partly or fully done by AI?'),
  ('wn_3', 'Has AI made your work more enjoyable, easier or actually more complicated? Could you give an example?'),
  ('wn_4', 'Do you ever worry that AI could take over parts of your work or your job? Why or why not?'),
  ('wn_5', 'What could your employer do to prepare you better for the changes brought by AI?'),
  ('wo_1', 'What does scientific research already tell us about the impact of AI on employment? And where is there still a lot of uncertainty?'),
  ('wo_2', 'Some researchers expect AI mainly to replace jobs, while others think new jobs will emerge. How do you view these different expectations?'),
  ('wo_3', 'What can we learn from earlier technological changes, such as the arrival of computers and the internet?'),
  ('wo_4', 'Do you think AI will widen or narrow the gap between higher- and lower-educated workers? Why?'),
  ('wo_5', 'Which recent studies or figures would you recommend we use for our research project?')
) as t(key, en)
where q.key = t.key and q.tekst_en is null;

update public.pws_iv_types s set naam_en = t.en,
  intro_en = 'Thank you for taking part in my research project!

My name is Dean and I am in my final year of pre-university secondary education (6 vwo) in the Netherlands. For my final research project (profielwerkstuk), I am investigating how AI is affecting the labour market and how young people can prepare for the future.

Alongside surveys, I am interviewing a number of people who deal with this topic through their work or studies.

I am especially interested in your own experiences, knowledge and expectations. There are no right or wrong answers.

Thank you so much in advance for your time and help!'
from (values
  ('ai-specialist', 'AI specialist'),
  ('hr-manager', 'HR manager or head of HR'),
  ('hoogleraar', 'Professor or academic researcher'),
  ('docent', 'Secondary school teacher'),
  ('werkgever', 'Employer or business owner'),
  ('werknemer', 'Employee'),
  ('student', 'Student or graduate starting out')
) as t(slug, en)
where s.slug = t.slug and s.intro_en is null;
