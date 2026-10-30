/* Un fichier central pour les douze paysages. Les fichiers manquants utilisent
   le fond neutre ci-dessous. Remplacer les images puis actualiser la page.
   Les illustrations transparentes sont posées sur une texture indépendante. */
window.BAZAR_THEME={
 months:{"1":"assets/Janvier-illustration.png","2":"assets/Février-illustration.png","3":"assets/Mars-illustration.png","4":"assets/Avril-illustration.png","5":"assets/Mai-illustration.png","6":"assets/Juin-illustration.png","7":"assets/Juillet-illustration.png","8":"assets/Aout-illustration.png","9":"assets/Septembre-illustration.png","10":"assets/Octobre-illustration.png","11":"assets/Novembre-illustration.png","12":"assets/Décembre-illustration.png"},
 fallback:{image:'assets/texture-lin-neutre.png',color:'#d3c2aa'},
 size:'cover',position:'center center',
 /* Le cadrage d'octobre validé est conservé. */
 monthSettings:{10:{size:'100vw 100dvh',position:'center center'}}
};
