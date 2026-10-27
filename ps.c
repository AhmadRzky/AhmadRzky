// probSAT exp-break for 5-SAT. usage: ps file.cnf seed secs cb
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <time.h>
#include <string.h>
static unsigned long long rs;static inline unsigned long long xr(){rs^=rs<<13;rs^=rs>>7;rs^=rs<<17;return rs;}
static inline double ur(){return (xr()>>11)*(1.0/9007199254740992.0);}
int n,m,*cl,*numT,*crit,*brk,*occS,*occ,*occN,*fal,*wh,nf;char*a;
int main(int c,char**v){FILE*f=fopen(v[1],"r");rs=atoll(v[2])*2654435761ULL+1;double secs=atof(v[3]);double cb=c>4?atof(v[4]):3.7;
 char line[256];while(fgets(line,256,f)){if(line[0]=='p'){sscanf(line,"p cnf %d %d",&n,&m);break;}}
 cl=malloc(sizeof(int)*m*5);for(int i=0;i<m;i++){for(int j=0;j<5;j++)fscanf(f,"%d",&cl[i*5+j]);int z;fscanf(f,"%d",&z);}
 occN=calloc(2*n+2,sizeof(int));for(int i=0;i<m*5;i++){int l=cl[i];occN[l>0?2*l:2*(-l)+1]++;}
 occS=malloc(sizeof(int)*(2*n+3));occS[0]=0;for(int i=0;i<2*n+2;i++)occS[i+1]=occS[i]+occN[i];
 occ=malloc(sizeof(int)*m*5);int*p=calloc(2*n+2,sizeof(int));for(int i=0;i<m;i++)for(int j=0;j<5;j++){int l=cl[i*5+j];int x=l>0?2*l:2*(-l)+1;occ[occS[x]+p[x]++]=i;}
 double pr[64];for(int i=0;i<64;i++)pr[i]=pow(cb,-i);
 a=malloc(n+1);numT=calloc(m,sizeof(int));crit=calloc(m,sizeof(int));brk=calloc(n+1,sizeof(int));fal=malloc(sizeof(int)*m);wh=malloc(sizeof(int)*m);
 time_t t0=time(0);long long flips=0;int best=m;
 for(int v_=1;v_<=n;v_++)a[v_]=xr()&1;
 nf=0;for(int i=0;i<m;i++){numT[i]=0;crit[i]=0;for(int j=0;j<5;j++){int l=cl[i*5+j];if((l>0)==a[abs(l)]){numT[i]++;crit[i]=abs(l);}}
  if(numT[i]==0){wh[i]=nf;fal[nf++]=i;}else if(numT[i]==1)brk[crit[i]]++;}
 while(nf>0){
  if((flips&0xFFFF)==0){if(time(0)-t0>secs)break;}
  if(nf<best){best=nf;}
  int ci=fal[xr()%nf];double s=0,pv[5];int vs[5];
  for(int j=0;j<5;j++){int x=abs(cl[ci*5+j]);vs[j]=x;int b=brk[x];pv[j]=b<64?pr[b]:0;s+=pv[j];}
  double r=ur()*s;int k=0;for(;k<4;k++){if(r<pv[k])break;r-=pv[k];}
  int x=vs[k];a[x]=!a[x];flips++;
  int tl=a[x]?2*x:2*x+1, fl=a[x]?2*x+1:2*x; // tl: now-true literal occs, fl: now-false
  for(int q=occS[tl];q<occS[tl+1];q++){int i=occ[q];numT[i]++;
    if(numT[i]==1){int last=fal[--nf];fal[wh[i]]=last;wh[last]=wh[i];crit[i]=x;brk[x]++;}
    else if(numT[i]==2){brk[crit[i]]--;}}
  for(int q=occS[fl];q<occS[fl+1];q++){int i=occ[q];numT[i]--;
    if(numT[i]==0){wh[i]=nf;fal[nf++]=i;brk[x]--;}
    else if(numT[i]==1){for(int j=0;j<5;j++){int l=cl[i*5+j];if((l>0)==a[abs(l)]){crit[i]=abs(l);break;}}brk[crit[i]]++;}}
 }
 if(nf==0){printf("s SATISFIABLE\nv");for(int i=1;i<=n;i++)printf(" %d",a[i]?i:-i);printf(" 0\n");}
 else printf("s UNKNOWN best %d flips %lld\n",best,flips);
 return 0;}
