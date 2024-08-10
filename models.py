from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    profile_picture = db.Column(db.String(200))
    preferences = db.relationship('Preference', backref='user', uselist=False)
    trips = db.relationship('Trip', backref='user', lazy=True)
    reviews = db.relationship('Review', backref='user', lazy=True)

    def __repr__(self):
        return f'<User {self.username}>'

class Destination(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    country = db.Column(db.String(100), nullable=False)
    continent = db.Column(db.String(100), nullable=False)
    type_of_travel = db.Column(db.String(100), nullable=False)
    best_time_to_visit = db.Column(db.String(100))
    average_cost = db.Column(db.Float)
    description = db.Column(db.Text)
    image = db.Column(db.String(200))  # Path to the image
    rating = db.Column(db.Float)  # User rating

    # Add relationships if necessary, e.g., attractions, accommodations

class Preference(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    budget = db.Column(db.String(50))
    travel_companions = db.Column(db.String(150))
    cuisine = db.Column(db.String(150))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    destination = db.Column(db.String(150))
    dates = db.Column(db.String(50))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
