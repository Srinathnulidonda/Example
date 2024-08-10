from flask import Blueprint, render_template
from .models import User
from . import db

main = Blueprint('main', __name__)

@main.route('/profile')
def profile():
    user = User.query.first()  # For simplicity, we assume a single user
    return render_template('profile.html', user=user)
