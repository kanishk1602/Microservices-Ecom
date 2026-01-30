Auth Service 

1️⃣ User logs in
2️⃣ Server creates JWT
3️⃣ JWT stored in cookie
4️⃣ Browser sends cookie automatically
5️⃣ Backend reads cookie
6️⃣ JWT verified → user allowed

frontend is copied form github, no idea how's implemented

i just know backend part

wait, ek cart h aur ek order history, when user picks something, it gets added to cart, aur jb order kr leta to wo history me save ho jata
yes

jab user login krta h, to get ho jata cart, jb kuch add krta h to updatre ho jata, order krte h
mongodb
just to check
rreading maarorreading maaro
rreading maaro
rreading maaro

order hai producer
uska consumer h payment
iske main hota h kafka topics banana
producer message publish krega us topic me

consumer jo is topic pe subscribed h, wo mesage aate receiev krega, aur jo aage usko task perform krna. h
order se jaise publish hoga ki 2 shoes aur 1 cap hai
payment usko pakrega, price nikalega, aur razirpay ko bhej dega
payment ka jo status hoga, successful ya fail wo payment prodcuer topic pe daal dega, isko email service receive krke email bhej deta, iske alawa wk analtics ka service h jo payment pe subscribed h, wo payment ka message ko ek google sheet me update krte jata

smjh aaya?
nhi, producer consumer banta nhi, jo upar define kiye h, wo pura time rehta

har service me, kafka import kiye, aur ek producer consumer banae
agar producer ka sirf kaam h to sirf producer banao
agar sirf consumer ka kaam h to sirf consumer banao

one more thing, kafka mere local system pe nhi chal raha, docker container me dalke run kr rahe h, wo easy rehta h
roomate ka bottle churake piye thewait
wait
yahi h

which service?

 i want full notes after this meet
 full proj description
 bana rhe hona?
 re re re kuttwa
 bhaukh jaldi, bhaukh

payment successful order service me jata, payment se kuch nhu hota