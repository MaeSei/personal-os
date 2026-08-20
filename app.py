import os
from datetime import datetime
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, flash, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-me")
db_url = os.environ.get("DATABASE_URL", "sqlite:///personalos.db")
if db_url.startswith("postgres://"): db_url = db_url.replace("postgres://","postgresql://",1)
app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("COOKIE_SECURE","0") == "1"
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
db = SQLAlchemy(app)

STATES=["inbox","ready","in_progress","blocked","waiting","done","someday"]
KINDS=["task","project","workflow","area","note"]
CONTEXTS=["Work","Home","RV","Family","Health","Other"]

class User(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    username=db.Column(db.String(120),unique=True,nullable=False)
    password_hash=db.Column(db.String(255),nullable=False)

class Item(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    title=db.Column(db.String(240),nullable=False)
    kind=db.Column(db.String(40),default="task",nullable=False)
    state=db.Column(db.String(40),default="inbox",nullable=False)
    context=db.Column(db.String(80),default="Other",nullable=False)
    next_action=db.Column(db.String(300))
    blocker=db.Column(db.String(300))
    notes=db.Column(db.Text)
    is_today=db.Column(db.Boolean,default=False,nullable=False)
    parent_id=db.Column(db.Integer,db.ForeignKey("item.id"))
    parent=db.relationship("Item",remote_side=[id],backref="children")
    created_at=db.Column(db.DateTime,default=datetime.utcnow,nullable=False)
    updated_at=db.Column(db.DateTime,default=datetime.utcnow,onupdate=datetime.utcnow,nullable=False)

class Change(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    item_id=db.Column(db.Integer,nullable=True)
    item_title=db.Column(db.String(240),nullable=False)
    change_type=db.Column(db.String(60),nullable=False)
    detail=db.Column(db.String(500))
    created_at=db.Column(db.DateTime,default=datetime.utcnow,nullable=False)

def login_required(fn):
    @wraps(fn)
    def wrapped(*a,**k):
        if not session.get("user_id"): return redirect(url_for("login",next=request.path))
        return fn(*a,**k)
    return wrapped

def log(item,t,detail=None):
    db.session.add(Change(item_id=item.id,item_title=item.title,change_type=t,detail=detail))

@app.before_request
def init():
    db.create_all()
    if User.query.count()==0:
        u,p=os.environ.get("ADMIN_USERNAME"),os.environ.get("ADMIN_PASSWORD")
        if u and p:
            db.session.add(User(username=u,password_hash=generate_password_hash(p))); db.session.commit()

@app.route("/login",methods=["GET","POST"])
def login():
    if request.method=="POST":
        user=User.query.filter_by(username=request.form.get("username","").strip()).first()
        if user and check_password_hash(user.password_hash,request.form.get("password","")):
            session["user_id"]=user.id
            return redirect(request.args.get("next") or url_for("dashboard"))
        flash("Incorrect username or password.")
    return render_template("login.html")

@app.post("/logout")
def logout():
    session.clear(); return redirect(url_for("login"))

@app.route("/")
@login_required
def dashboard():
    q=Item.query
    return render_template("dashboard.html",
        today=q.filter_by(is_today=True).filter(Item.state!="done").order_by(Item.id).all(),
        ready=q.filter_by(state="ready",is_today=False).order_by(Item.updated_at.desc()).all(),
        blocked=q.filter_by(state="blocked").all(),
        waiting=q.filter_by(state="waiting").all(),
        projects=q.filter(Item.kind.in_(["project","workflow"]),Item.state.in_(["ready","in_progress","blocked","waiting"])).order_by(Item.context,Item.title).all(),
        changes=Change.query.order_by(Change.created_at.desc()).limit(8).all())

@app.route("/inbox")
@login_required
def inbox():
    return render_template("list.html",heading="Inbox",subheading="Capture first. Decide later.",items=Item.query.filter_by(state="inbox").order_by(Item.created_at.desc()).all())

@app.route("/projects")
@login_required
def projects():
    return render_template("list.html",heading="Projects & workflows",subheading="Outcomes that require more than one action.",items=Item.query.filter(Item.kind.in_(["project","workflow"])).order_by(Item.context,Item.title).all())

@app.route("/changes")
@login_required
def changes():
    return render_template("changes.html",items=Change.query.order_by(Change.created_at.desc()).limit(100).all())

@app.post("/items")
@login_required
def create_item():
    title=request.form.get("title","").strip()
    if not title: return redirect(request.referrer or url_for("dashboard"))
    i=Item(title=title,kind=request.form.get("kind","task"),state=request.form.get("state","inbox"),
           context=request.form.get("context","Other"),next_action=request.form.get("next_action") or None,
           blocker=request.form.get("blocker") or None,notes=request.form.get("notes") or None,
           is_today=request.form.get("is_today")=="on")
    db.session.add(i); db.session.flush(); log(i,"created",f"State: {i.state}"); db.session.commit()
    return redirect(request.referrer or url_for("dashboard"))

@app.route("/items/<int:item_id>")
@login_required
def item(item_id):
    i=Item.query.get_or_404(item_id)
    parents=Item.query.filter(Item.id!=i.id,Item.kind.in_(["project","workflow","area"])).order_by(Item.title).all()
    return render_template("item.html",item=i,parents=parents,states=STATES,kinds=KINDS,contexts=CONTEXTS)

@app.post("/items/<int:item_id>/update")
@login_required
def update(item_id):
    i=Item.query.get_or_404(item_id); old=i.state
    i.title=request.form["title"].strip(); i.kind=request.form["kind"]; i.state=request.form["state"]; i.context=request.form["context"]
    i.next_action=request.form.get("next_action","").strip() or None; i.blocker=request.form.get("blocker","").strip() or None
    i.notes=request.form.get("notes","").strip() or None; i.is_today=request.form.get("is_today")=="on"
    pid=request.form.get("parent_id"); i.parent_id=int(pid) if pid else None
    log(i,"state",f"{old} → {i.state}") if old!=i.state else log(i,"updated")
    db.session.commit(); return redirect(url_for("item",item_id=i.id))

@app.post("/items/<int:item_id>/today")
@login_required
def today(item_id):
    i=Item.query.get_or_404(item_id); i.is_today=not i.is_today; log(i,"today","Added" if i.is_today else "Removed"); db.session.commit()
    return redirect(request.referrer or url_for("dashboard"))

@app.post("/items/<int:item_id>/done")
@login_required
def done(item_id):
    i=Item.query.get_or_404(item_id); old=i.state; i.state="done"; i.is_today=False; log(i,"state",f"{old} → done"); db.session.commit()
    return redirect(request.referrer or url_for("dashboard"))

@app.post("/seed")
@login_required
def seed():
    if Item.query.count(): flash("Starter data skipped: database is not empty."); return redirect(url_for("dashboard"))
    data=[
      ("Flowcell A","workflow","blocked","Work","Adapt filename handling for manual reanalysis output","Manual reanalysis filenames are incompatible with the demultiplexing script","KS RNA + KS Exome",False),
      ("Flowcell B","workflow","ready","Work","Upload dataset to cloud storage",None,"Rui WGS + Shireen",True),
      ("KS validation changes","project","ready","Work","Summarise validation changes that KS must approve",None,None,False),
      ("LIMS system","project","in_progress","Work","Define the next unfinished module or blocker",None,None,False),
      ("New price list","project","ready","Work","Collect current service prices and material costs",None,None,False),
      ("Bill Lars for reagents","task","ready","Work","Collect reagent amount and cost",None,None,False),
      ("Update salaries","task","ready","Work","List salary changes that need processing",None,None,False),
      ("MGI chuck replacement","task","ready","Work","Find chuck details and send replacement request",None,None,False),
      ("Renovate stairs","project","someday","Home","Measure staircase",None,None,False),
      ("Tiny bathroom renovation","project","ready","Home","List what remains unfinished",None,None,False),
      ("Clean basement","project","someday","Home","Clear one square metre",None,None,False),
      ("Clean garage","project","someday","Home","Clear one visible surface or floor patch",None,None,False),
      ("Renovate kitchen","project","someday","Home",None,None,None,False),
      ("Prepare garden for winter","project","ready","Home","Walk through garden and list three winter-prep actions",None,None,False),
      ("RV yearly inspection","project","ready","RV","Find last inspection report and list known faults",None,None,False),
      ("Fix kitchen electrical outlet","task","ready","Home","Identify fault and required safe repair route",None,None,False),
      ("Organise pictures","project","someday","Home","Choose one folder/year to sort",None,None,False),
      ("Organise laundry room","project","ready","Home","Clear one shelf or surface",None,None,False)]
    for x in data:
        i=Item(title=x[0],kind=x[1],state=x[2],context=x[3],next_action=x[4],blocker=x[5],notes=x[6],is_today=x[7]); db.session.add(i); db.session.flush(); log(i,"created",f"State: {i.state}")
    db.session.commit(); flash("Starter data loaded."); return redirect(url_for("dashboard"))

@app.route("/manifest.webmanifest")
def manifest(): return send_from_directory("static","manifest.webmanifest",mimetype="application/manifest+json")
@app.route("/sw.js")
def sw(): return send_from_directory("static","sw.js",mimetype="application/javascript")
@app.route("/health")
def health(): return {"status":"ok"}

if __name__=="__main__":
    app.run(host="0.0.0.0",port=int(os.environ.get("PORT",5000)))
