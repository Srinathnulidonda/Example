from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import IntegrityError
from nltk.sentiment import SentimentIntensityAnalyzer
from flask_migrate import Migrate
import random
import bcrypt
app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Change this to a random secret key
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///traveldatabase.db'  # Update with your database URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    profile_picture = db.Column(db.String(200))
    preferences = db.relationship('Preference', backref='user', uselist=False)
    trips = db.relationship('Trip', backref='user', lazy=True)
    reviews = db.relationship('Review', backref='user', lazy=True)

    def __init__(self, username, email, password, name):
        self.username = username
        self.name = name
        self.email = email
        self.password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        self.id = self.generate_unique_id()  # Generate a unique ID when creating a user

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password.encode('utf-8'))

    @staticmethod
    def generate_unique_id():
        while True:
            random_id = random.randint(100, 10000)
            if not User.query.get(random_id):  # Check if the ID is unique
                return random_id
            
class Preference(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    budget = db.Column(db.String(20), nullable=False)
    travel_companions = db.Column(db.String(20), nullable=False)
    cuisine = db.Column(db.String(200), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    destination = db.Column(db.String(100), nullable=False)
    dates = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    place = db.Column(db.String(100), nullable=False)
    review = db.Column(db.Text, nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

with app.app_context():
    db.create_all()
    

@app.route('/')
def home():
    return render_template('index.html')
    
@app.route('/profile')
def profile():
    user_id = session.get('user_id')  # Get user ID from session
    if not user_id:
        flash('You need to log in first.', 'danger')
        return redirect(url_for('login'))
    
    user = User.query.get(user_id)  # Fetch the user object using the user ID
    return render_template('profile.html', user=user)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        name = request.form['name']
        email = request.form['email']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        
        if password != confirm_password:
            flash('Passwords do not match', 'danger')
            return redirect(url_for('register'))
        
        try:
            new_user = User(username=username, name=name, email=email, password=password)
            db.session.add(new_user)
            db.session.commit()
            flash('Registration successful! Please log in.', 'success')
            return redirect('/login')
        except IntegrityError:
            db.session.rollback()
            flash('Email already exists. Please use a different email.', 'danger')
            return redirect(url_for('register'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email_or_username = request.form.get('login')
        password = request.form.get('password')

        user = User.query.filter((User.email == email_or_username) | (User.username == email_or_username)).first()

        if user is None:
            flash('Username or email does not exist. Please register.', 'danger')
            return redirect(url_for('login'))

        if user.check_password(password):
            session['user_id'] = user.id  # Store user ID in session
            session['username'] = user.username
            flash('Login successful! Welcome back.', 'success')
            return redirect('/profile')  # Redirect to profile
        else:
            flash('Invalid password. Please try again.', 'danger')
            return redirect(url_for('login'))

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)  # Remove user ID from session
    session.pop('username', None)  # Remove username from session
    flash('You have been logged out successfully.', 'success')  # Flash a success message
    return redirect(url_for('login'))  # Redirect to the login page

@app.route('/recommendations')
def recommendations():
    attractions = [
        {"id": 1, "name": "Eiffel Tower", "type": "historical", "rating": 4.8, "distance": "2km",
         "description": "An iconic symbol of Paris.", "image": "eiffel.jpg"},
        {"id": 2, "name": "Louvre Museum", "type": "historical", "rating": 4.7, "distance": "3km",
         "description": "The world's largest art museum.", "image": "louvre.jpg"},
        {"id": 3, "name": "Le Jules Verne", "type": "dining", "rating": 4.5, "distance": "1km",
         "description": "A gourmet restaurant in the Eiffel Tower.", "image": "jules.jpg"}
    ]
    return render_template('recommendations.html', attractions=attractions)

@app.route('/detail/<int:id>')
def detail(id):
    detail_data = {
        1: {"name": "Eiffel Tower", "description": "An iconic symbol of Paris.", "reviews": ["Amazing place!", "A must-visit.", "Incredible view."]},
        2: {"name": "Louvre Museum", "description": "The world's largest art museum.", "reviews": ["A treasure trove of art.", "Absolutely stunning.", "A bit crowded."]},
        3: {"name": "Le Jules Verne", "description": "A gourmet restaurant in the Eiffel Tower.", "reviews": ["Delicious food!", "Great service.", "Pricy but worth it."]}
    }
    data = detail_data.get(id, {})
    analyzer = SentimentIntensityAnalyzer()
    sentiments = [{"review": review, "sentiment": analyzer.polarity_scores(review)} for review in data.get('reviews', [])]
    return render_template('detail.html', detail=data, sentiments=sentiments)

def generate_recommendations(budget, travel_companions, cuisine):
    # Sample data for recommendations, now including an image attribute
    places = [
        {"id": 1, "name": "Budget Hotel A", "type": "hotel", "budget": "low", "cuisine": "Italian", "image": "budget_hotel_a.jpg", "description": "A cozy budget hotel."},
        {"id": 2, "name": "Luxury Hotel B", "type": "hotel", "budget": "high", "cuisine": "Chinese", "image": "luxury_hotel_b.jpg", "description": "A luxurious stay with great amenities."},
        {"id": 3, "name": "Family Resort C", "type": "hotel", "budget": "medium", "cuisine": "Indian", "image": "family_resort_c.jpg", "description": "Perfect for family vacations."},
        {"id": 4, "name": "Italian Bistro D", "type": "restaurant", "budget": "low", "cuisine": "Italian", "image": "italian_bistro_d.jpg", "description": "Authentic Italian cuisine."},
        {"id": 5, "name": "Fine Dining E", "type": "restaurant", "budget": "high", "cuisine": "Mexican", "image": "fine_dining_e.jpg", "description": "A fine dining experience with exquisite dishes."},
    ]

    # Filter recommendations based on user preferences
    recommendations = []
    for place in places:
        if place['budget'] == budget and (place['cuisine'] in cuisine.split(',')):
            recommendations.append(place)

    return recommendations

@app.route('/preferences', methods=['GET', 'POST'])
def preferences():
    user_id = session.get('user_id')
    if not user_id:
        flash('You need to log in first.', 'danger')
        return redirect(url_for('login'))

    user_obj = User.query.get(user_id)

    if request.method == 'POST':
        budget = request.form['budget']
        travel_companions = request.form['travel_companions']
        cuisine = ','.join(request.form.getlist('cuisine'))

        # Update or create preferences
        if user_obj.preferences:
            user_obj.preferences.budget = budget
            user_obj.preferences.travel_companions = travel_companions
            user_obj.preferences.cuisine = cuisine
        else:
            new_preference = Preference(budget=budget, travel_companions=travel_companions, cuisine=cuisine, user_id=user_obj.id)
            db.session.add(new_preference)

        db.session.commit()
        flash('Preferences updated successfully!', 'success')

        # Generate recommendations based on preferences
        recommendations = generate_recommendations(budget, travel_companions, cuisine)
        return render_template('recommendations.html', recommendations=recommendations)

    return render_template('preferences.html', preferences=user_obj.preferences if user_obj.preferences else {})

@app.route('/reviews')
def reviews():
    user_id = session.get('user_id')  # Get user ID from session
    if not user_id:
        flash('You need to log in first.', 'danger')
        return redirect(url_for('login'))
    
    user = User.query.get(user_id)  # Fetch the user object using the user ID
    return render_template('reviews.html', reviews=user.reviews if user.reviews else [])

@app.route('/help')
def help():
    return render_template('help.html')

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
    
@app.route('/destinations')
def destinations():
    destinations = Destination.query.all()  # Fetch all destinations
    return render_template('destinations.html', destinations=destinations)

@app.route('/destinations/<int:destination_id>')
def destination_detail(destination_id):
    destination = Destination.query.get_or_404(destination_id)  # Fetch destination by ID
    return render_template('destination_detail.html', destination=destination)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Create database tables
    app.run(debug=True)